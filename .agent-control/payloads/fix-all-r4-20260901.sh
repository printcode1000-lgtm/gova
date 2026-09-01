#!/usr/bin/env bash
set -euo pipefail

git fetch origin agent-request/chatgpt
git show FETCH_HEAD:.agent-control/payloads/fix-all-r3-20260901.sh > /tmp/gova-fix-all-r3-base.sh
set +e
bash /tmp/gova-fix-all-r3-base.sh
base_rc=$?
set -e
echo "R3_BASE_RC=$base_rc"

python3 <<'PY'
from pathlib import Path
import re

path = Path('.github/workflows/local-agent-gateway.yml')
text = path.read_text()
# Normalize any intermediate wildcard spelling produced by the previous
# migration attempt to the one permanent control branch.
text = re.sub(r'^\s*-\s*["\']?agent-request/[^"\'\s]+["\']?\s*$', '      - "agent-request/chatgpt"', text, flags=re.M)
path.write_text(text)

# The policy itself must be explicit and non-wildcard.
policy_path = Path('scripts/github-ci-policy.ts')
policy = policy_path.read_text()
if '- "agent-request/chatgpt"' not in policy:
    raise SystemExit('gateway CI policy did not retain exact permanent branch requirement')
policy_path.write_text(policy)

workflow = path.read_text()
if '      - "agent-request/chatgpt"' not in workflow:
    raise SystemExit('gateway workflow exact branch normalization failed')
if 'agent-request/**' in workflow or 'agent-request/chatgpt*' in workflow:
    raise SystemExit('gateway workflow still contains wildcard request branch')
PY

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
rm -rf .tmp-gova-build

npm run typecheck
npm run lint
npx tsx scripts/validate-error-logging.ts
npm run github:ci-policy

git status --short
echo FIX_ALL_CODE_GATES=PASS
