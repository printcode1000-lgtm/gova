#!/usr/bin/env bash
set -euo pipefail

git fetch origin agent-request/chatgpt
git show FETCH_HEAD:.agent-control/payloads/fix-all-r10-20260901.sh > /tmp/gova-fix-all-r10-base.sh
set +e
bash /tmp/gova-fix-all-r10-base.sh
base_rc=$?
set -e
echo "R10_BASE_RC=$base_rc"

python3 <<'PY'
from pathlib import Path
p = Path('services/control/next.config.ts')
s = p.read_text()
old = """const serviceRoot = __dirname;
const repositoryRoot = path.resolve(serviceRoot, '../..');
const buildRoot = existsSync(path.join(serviceRoot, 'node_modules', 'next', 'package.json'))
  ? serviceRoot
  : repositoryRoot;
"""
new = """const serviceRoot = __dirname;

function findNextBuildRoot(start: string): string {
  let current = start;
  while (true) {
    if (existsSync(path.join(current, 'node_modules', 'next', 'package.json'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return start;
    current = parent;
  }
}

const buildRoot = findNextBuildRoot(serviceRoot);
"""
if old in s:
    s = s.replace(old, new, 1)
elif 'function findNextBuildRoot' not in s:
    raise SystemExit('r10 control build-root block not found')
p.write_text(s)

d = Path('docs/06-super-admin-and-operations/control-runtime.md')
ds = d.read_text()
ds = ds.replace(
    "The control Next config selects the Turbopack root from where the local `next` package actually exists, so the independent deployment root stays hermetic without forcing a second dependency install during repository verification.",
    "The control Next config walks upward from the service and selects the nearest root that actually contains `node_modules/next`. That covers the normal repository, an isolated agent worktree that reuses the canonical install, and a standalone Vercel install without forcing a second dependency install during repository verification.",
)
d.write_text(ds)
PY

npm run control:verify
npm run control:build
npm run control:smoke
npm run test:vercel-deploy-core
npm run test:deployment-tools
npm run verify:all
npm run test
npm run docs:generate
npm run docs:ci
npm run architecture:check
npm run typecheck
npm run lint
npx tsx scripts/validate-error-logging.ts
npm run github:ci-policy

rm -rf .tmp-gova-build
npm run gova:tree
(
  cd .tmp-gova-build
  ASOL_RUNTIME_ROLE=gova-frontend node ../node_modules/next/dist/bin/next build
)
./node_modules/.bin/tsx -e "import { assertGovaArtifact } from '@asol/gova-deployment-core'; const r=assertGovaArtifact('.tmp-gova-build'); console.log('GOVA_ARTIFACT_API_FUNCTIONS='+r.apiFunctions.join(',')); if (r.apiFunctions.some((x)=>x !== 'health')) process.exit(72);"
ASOL_CORS_ORIGINS='https://trusted.example' ./node_modules/.bin/tsx -e "import { NextRequest } from 'next/server'; import { proxy } from './src/proxy'; const req=new NextRequest('https://gova.example/api/products',{method:'OPTIONS',headers:{origin:'https://trusted.example.evil.tld','access-control-request-method':'GET'}}); const res=proxy(req); const reflected=res.headers.get('access-control-allow-origin'); console.log('SPOOF_REFLECTED='+String(reflected)); if (reflected) process.exit(73);"
ASOL_CORS_ORIGINS='https://trusted.example' ./node_modules/.bin/tsx -e "import { NextRequest } from 'next/server'; import { proxy } from './src/proxy'; const req=new NextRequest('https://gova.example/api/products',{method:'OPTIONS',headers:{origin:'https://trusted.example','access-control-request-method':'GET'}}); const res=proxy(req); const reflected=res.headers.get('access-control-allow-origin'); console.log('TRUSTED_REFLECTED='+String(reflected)); if (reflected !== 'https://trusted.example') process.exit(74);"
rm -rf .tmp-gova-build

npm run typecheck
npm run lint
npx tsx scripts/validate-error-logging.ts
npm run github:ci-policy

git status --short
echo FIX_ALL_CODE_GATES=PASS
