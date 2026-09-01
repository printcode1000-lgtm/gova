#!/usr/bin/env bash
set -euo pipefail

git fetch origin agent-request/chatgpt
git show FETCH_HEAD:.agent-control/payloads/fix-all-r11-20260901.sh > /tmp/gova-fix-all-r11-base.sh
set +e
bash /tmp/gova-fix-all-r11-base.sh
base_rc=$?
set -e
echo "R11_BASE_RC=$base_rc"

python3 <<'PY'
from pathlib import Path
import json

p = Path('package.json')
data = json.loads(p.read_text())
old = 'npm run control:sync && npm --prefix services/control run build'
new = 'npm run control:sync && npm --prefix services/control ci --no-audit --no-fund && npm --prefix services/control run build'
current = data['scripts'].get('control:build')
if current == old:
    data['scripts']['control:build'] = new
elif current != new:
    raise SystemExit(f'unexpected control:build script: {current!r}')
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

d = Path('docs/06-super-admin-and-operations/control-runtime.md')
ds = d.read_text()
ds = ds.replace(
    '| `npm run control:build` | Sync, then `next build` inside the service |',
    '| `npm run control:build` | Sync, install the service locked dependencies, then `next build` inside the service |',
)
ds = ds.replace(
    'The control Next config walks upward from the service and selects the nearest root that actually contains `node_modules/next`. That covers the normal repository, an isolated agent worktree that reuses the canonical install, and a standalone Vercel install without forcing a second dependency install during repository verification.',
    'The control runtime is an independent deployable with its own lockfile. `control:build` installs that locked dependency graph before building, so repository worktrees and standalone Vercel builds resolve the same local Next.js package without depending on the root install.',
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
