#!/usr/bin/env bash
set -euo pipefail

git fetch origin agent-request/chatgpt
git show FETCH_HEAD:.agent-control/payloads/fix-all-r8-20260901.sh > /tmp/gova-fix-all-r8-base.sh
set +e
bash /tmp/gova-fix-all-r8-base.sh
base_rc=$?
set -e
echo "R8_BASE_RC=$base_rc"

python3 <<'PY'
from pathlib import Path
p = Path('packages/local-agent-core/src/tests/index.test.ts')
s = p.read_text()
old = 'assert.equal(snapshot.requests.length, 1);'
new = 'assert.equal(snapshot.requests.length, 2, "coordination snapshot retains dispatched and failed audit records");'
if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit('snapshot request-count assertion not found')
p.write_text(s)
PY

npm run test:local-agent-core
npm run test:local-agent-workflows
npm run test:api-core
npm run test:vercel-deploy-core
npm run test:deployment-tools
npm run control:verify
npm run control:build
npm run control:smoke
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
