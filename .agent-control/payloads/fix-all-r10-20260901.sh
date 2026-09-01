#!/usr/bin/env bash
set -euo pipefail

git fetch origin agent-request/chatgpt
git show FETCH_HEAD:.agent-control/payloads/fix-all-r9-20260901.sh > /tmp/gova-fix-all-r9-base.sh
set +e
bash /tmp/gova-fix-all-r9-base.sh
base_rc=$?
set -e
echo "R9_BASE_RC=$base_rc"

python3 <<'PY'
from pathlib import Path

p = Path('services/control/next.config.ts')
s = p.read_text()
if "from 'node:fs'" not in s:
    s = s.replace("import type { NextConfig } from 'next';\n", "import { existsSync } from 'node:fs';\nimport path from 'node:path';\nimport type { NextConfig } from 'next';\n", 1)
anchor = "const nextConfig: NextConfig = {\n"
setup = """const serviceRoot = __dirname;
const repositoryRoot = path.resolve(serviceRoot, '../..');
const buildRoot = existsSync(path.join(serviceRoot, 'node_modules', 'next', 'package.json'))
  ? serviceRoot
  : repositoryRoot;

"""
if 'const buildRoot =' not in s:
    if anchor not in s:
        raise SystemExit('control next config anchor not found')
    s = s.replace(anchor, setup + anchor, 1)
s = s.replace("    root: __dirname,", "    root: buildRoot,", 1)
if 'root: buildRoot' not in s:
    raise SystemExit('control turbopack root repair failed')
p.write_text(s)

# Make the local/standalone root decision part of the control contract.
t = Path('scripts/tests/control-service.test.ts')
ts = t.read_text()
needle = "const OPERATIONAL = new Set(['/api/health', '/api/release-readiness/[revision]']);"
check = """
const controlNextConfig = readFileSync(path.join(ROOT, 'services/control/next.config.ts'), 'utf8');
assert.match(controlNextConfig, /node_modules[\\s\\S]*next[\\s\\S]*package\\.json/);
assert.match(controlNextConfig, /root:\\s*buildRoot/);
"""
if 'root:\\s*buildRoot' not in ts:
    if needle not in ts:
        raise SystemExit('control test insertion anchor not found')
    ts = ts.replace(needle, needle + check, 1)
t.write_text(ts)

# Document why the same service builds both from the monorepo and as an isolated Vercel root.
d = Path('docs/06-super-admin-and-operations/control-runtime.md')
ds = d.read_text()
marker = "| `npm run control:build` | Sync, then `next build` inside the service |"
paragraph = """

`control:build` supports both execution shapes deliberately: a repository build reuses the root `node_modules`, while a standalone Vercel build uses `services/control/node_modules`. The control Next config selects the Turbopack root from where the local `next` package actually exists, so the independent deployment root stays hermetic without forcing a second dependency install during repository verification.
"""
if 'selects the Turbopack root from where the local `next` package actually exists' not in ds:
    if marker not in ds:
        raise SystemExit('control documentation command marker not found')
    idx = ds.find('\n', ds.find(marker))
    ds = ds[:idx+1] + paragraph + ds[idx+1:]
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
