#!/usr/bin/env bash
set -euo pipefail

git fetch origin agent-request/chatgpt
git show FETCH_HEAD:.agent-control/payloads/fix-all-r4-20260901.sh > /tmp/gova-fix-all-r4-base.sh
set +e
bash /tmp/gova-fix-all-r4-base.sh
base_rc=$?
set -e
echo "R4_BASE_RC=$base_rc"

python3 <<'PY'
from pathlib import Path

path = Path('scripts/local-agent-direct-remote.ts')
text = path.read_text()
text = text.replace(
    'Promise<{client:DirectAgentClient;path:string;tunnel?:DirectWebRtcClientTunnel}>',
    'Promise<{agentClient:DirectAgentClient;path:string;tunnel?:DirectWebRtcClientTunnel}>',
)
text = text.replace('return {client,path:`loopback:tcp:', 'return {agentClient:client,path:`loopback:tcp:')
text = text.replace('return {client,path:`${candidate.type}:tcp:', 'return {agentClient:client,path:`${candidate.type}:tcp:')
text = text.replace('return {client,path:"webrtc:ice:udp:datachannel",tunnel};', 'return {agentClient:client,path:"webrtc:ice:udp:datachannel",tunnel};')
text = text.replace('session.client', 'session.agentClient')
if 'session.client.exec' in text or 'session.client.close' in text:
    raise SystemExit('DirectAgentClient session property rename incomplete')
if 'agentClient.exec' not in text:
    raise SystemExit('DirectAgentClient exec seam was not preserved')
path.write_text(text)
PY

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
