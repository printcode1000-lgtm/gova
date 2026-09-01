#!/usr/bin/env bash
set -euo pipefail

git fetch origin agent-request/chatgpt
git show FETCH_HEAD:.agent-control/payloads/fix-all-r12-20260901.sh > /tmp/gova-fix-all-r12-base.sh
set +e
bash /tmp/gova-fix-all-r12-base.sh
base_rc=$?
set -e
echo "R12_BASE_RC=$base_rc"

python3 <<'PY'
from pathlib import Path

p = Path('packages/ota-core/src/tests/store-production-truth.test.ts')
s = p.read_text()
old = '''      resolveOtaNativeCompatibilityLine({
        declaration: declaration(true, true),
        credentialsReady: { android: true, ios: false },
      }),'''
new = '''      resolveOtaNativeCompatibilityLine({
        declaration: declaration(true, true),
        readers: { android: async () => "1.2.0" },
        credentialsReady: { ios: false },
      }),'''
count = s.count(old)
if count != 2:
    raise SystemExit(f'expected 2 OTA missing-iOS fixtures, found {count}')
s = s.replace(old, new)
p.write_text(s)
PY

# Service contract tests inspect generated mirrors. Build them before the full gate.
npm run services:sync
# Architecture validates generated agent knowledge; refresh it after script/docs changes.
npm run docs:generate

# Fail fast on the three gates that were the only remaining failures in r12.
npm run architecture:check
npm run test:notifications
npm run test:ota-core

# Full repository proof.
npm run verify:all
npm run test
npm run docs:generate
npm run docs:ci
npm run architecture:check
npm run typecheck
npm run lint
npx tsx scripts/validate-error-logging.ts
npm run github:ci-policy
npm run control:verify
npm run control:build
npm run control:smoke
npm run test:vercel-deploy-core
npm run test:deployment-tools

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

npm run docs:generate
npm run docs:ci
npm run architecture:check
npm run typecheck
npm run lint
npx tsx scripts/validate-error-logging.ts
npm run github:ci-policy

git status --short
echo FIX_ALL_CODE_GATES=PASS
