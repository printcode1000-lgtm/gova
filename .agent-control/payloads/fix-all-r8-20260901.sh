#!/usr/bin/env bash
set -euo pipefail

git fetch origin agent-request/chatgpt
git show FETCH_HEAD:.agent-control/payloads/fix-all-r6-20260901.sh > /tmp/gova-fix-all-r6-base.sh
set +e
bash /tmp/gova-fix-all-r6-base.sh
base_rc=$?
set -e
echo "R6_BASE_RC=$base_rc"

python3 <<'PY'
from pathlib import Path

# gova owns its CORS allowlist. Do not call the shared permissive preflight helper
# here because that helper intentionally reflects request origins for service
# runtimes and can re-introduce a rejected origin into the response.
proxy_path = Path('src/proxy.ts')
proxy = proxy_path.read_text()
proxy = proxy.replace(
    "import { BROWSER_REQUEST_HEADERS, preflightFor } from '@asol/service-runtime-core';",
    "import { BROWSER_REQUEST_HEADERS } from '@asol/service-runtime-core';",
    1,
)
old = '''      const response = preflightFor(request, {
        methods: allowedMethods.join(', '),
        headers: BROWSER_REQUEST_HEADERS,
      });
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
      return response;'''
new = '''      const response = new NextResponse(null, { status: 204 });
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
      response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
      return response;'''
if old in proxy:
    proxy = proxy.replace(old, new, 1)
if 'preflightFor(request' in proxy:
    raise SystemExit('gova proxy still uses permissive preflightFor')
if "origin.startsWith(entry)" in proxy:
    proxy = proxy.replace(
        "return allowed.some((entry) => entry === origin || origin.startsWith(entry));",
        "return allowed.includes(origin);",
        1,
    )
if "return allowed.includes(origin);" not in proxy:
    raise SystemExit('exact CORS origin allowlist is not active')
proxy_path.write_text(proxy)

# The retry-safety regression added by r6 must import the new public helper.
test_path = Path('packages/local-agent-core/src/tests/index.test.ts')
test = test_path.read_text()
import_end = test.find('from "@asol/local-agent-core";')
if import_end < 0:
    raise SystemExit('local-agent-core test import not found')
import_prefix = test[:import_end]
if 'blockedRequestIds' not in import_prefix:
    marker = 'import { acquireLock, '
    if marker not in test:
        raise SystemExit('local-agent-core import anchor not found')
    test = test.replace(marker, 'import { acquireLock, blockedRequestIds, ', 1)
if 'blockedRequestIds' not in test[:test.find('from "@asol/local-agent-core";')]:
    raise SystemExit('blockedRequestIds import repair failed')
test_path.write_text(test)
PY

npm run docs:generate
npm run typecheck
npm run lint
npx tsx scripts/validate-error-logging.ts
npm run github:ci-policy
npm run architecture:check
npm run docs:ci
npm run test:api-core
npm run test:local-agent-core
npm run test:local-agent-workflows
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
