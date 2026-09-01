#!/usr/bin/env bash
set -euo pipefail

git fetch origin agent-request/chatgpt
git show FETCH_HEAD:.agent-control/payloads/fix-all-r5-20260901.sh > /tmp/gova-fix-all-r5-base.sh
set +e
bash /tmp/gova-fix-all-r5-base.sh
base_rc=$?
set -e
echo "R5_BASE_RC=$base_rc"

python3 <<'PY'
from pathlib import Path

# A request whose workflow_dispatch genuinely failed is retryable. Accepted and
# dispatched remain blocking because retrying an uncertain accepted request could
# double-execute after a crash between dispatch and final ledger write.
store_path = Path('packages/local-agent-core/src/request-store.ts')
store = store_path.read_text()
anchor = '''export function knownRequestIds(): Set<string> {
  return new Set(
    listJsonFiles(requestsDir()).map((filePath) => path.basename(filePath, ".json")),
  );
}
'''
addition = anchor + '''
export function blockedRequestIds(): Set<string> {
  const blocked = new Set<string>();
  for (const filePath of listJsonFiles(requestsDir())) {
    const requestId = path.basename(filePath, ".json");
    const record = readJsonFile<RequestRecord>(filePath);
    if (!record || record.outcome !== "failed") blocked.add(requestId);
  }
  return blocked;
}
'''
if 'export function blockedRequestIds()' not in store:
    if anchor not in store:
        raise SystemExit('request-store knownRequestIds anchor missing')
    store = store.replace(anchor, addition, 1)
store_path.write_text(store)

# The gateway uses the non-retryable set for duplicate checks and validation.
gateway_path = Path('scripts/local-agent-gateway.ts')
gateway = gateway_path.read_text()
gateway = gateway.replace('  knownRequestIds,', '  blockedRequestIds,\n  knownRequestIds,', 1)
gateway = gateway.replace(
    'if (candidateId && knownRequestIds().has(candidateId)) {',
    'if (candidateId && blockedRequestIds().has(candidateId)) {',
    1,
)
gateway = gateway.replace(
    'const validation = validateDispatchRequest(parsed, { knownRequestIds: knownRequestIds() });',
    'const validation = validateDispatchRequest(parsed, { knownRequestIds: blockedRequestIds() });',
    1,
)
gateway = gateway.replace(
    '!knownRequestIds().has(candidateId)',
    '!blockedRequestIds().has(candidateId)',
    1,
)
if gateway.count('blockedRequestIds') < 4:
    raise SystemExit('gateway retry-safe duplicate checks incomplete')
gateway_path.write_text(gateway)

# Regression test: failed dispatch ids are retryable, dispatched ids are not.
test_path = Path('packages/local-agent-core/src/tests/index.test.ts')
test = test_path.read_text()
if 'blockedRequestIds,' not in test:
    test = test.replace('  knownRequestIds,', '  blockedRequestIds,\n  knownRequestIds,', 1)
needle = 'assert.equal(knownRequestIds().has("req-00000002"), true);\n'
insert = needle + '''recordRequest({
  requestId: "req-00000003",
  agentId: "cloud-alpha",
  workflow: "local-agent-main",
  mode: "main",
  ref: "main",
  inputKeys: ["shell_command"],
  createdAt: new Date().toISOString(),
  outcome: "failed",
  errors: ["transient dispatch failure"],
});
assert.equal(knownRequestIds().has("req-00000003"), true, "the audit ledger retains failed dispatches");
assert.equal(blockedRequestIds().has("req-00000002"), true, "a dispatched request cannot replay");
assert.equal(blockedRequestIds().has("req-00000003"), false, "a failed workflow dispatch may retry safely");
'''
if 'a failed workflow dispatch may retry safely' not in test:
    if needle not in test:
        raise SystemExit('request ledger test insertion point missing')
    test = test.replace(needle, insert, 1)
test_path.write_text(test)

# Document the exact distinction so operators do not delete ledger records to retry.
doc_path = Path('docs/07-mobile-and-release/local-agent-runner-pool.md')
doc = doc_path.read_text()
paragraph = '''
A request ID is blocked permanently after validation rejection or a successful dispatch. A request whose `workflow_dispatch` call itself failed is retained in the audit ledger with outcome `failed` but is retryable on a later push; an `accepted` record remains blocked because a crash after dispatch but before the final ledger write is ambiguous and must fail closed rather than risk duplicate mutation.
'''
if 'A request ID is blocked permanently after validation rejection' not in doc:
    marker = 'old malformed or rejected history therefore cannot make a later valid dispatch fail.'
    if marker not in doc:
        raise SystemExit('local-agent gateway documentation marker missing')
    pos = doc.find('\n', doc.find(marker))
    doc = doc[:pos+1] + paragraph + doc[pos+1:]
doc_path.write_text(doc)
PY

npm run docs:generate
npm run typecheck
npm run lint
npx tsx scripts/validate-error-logging.ts
npm run github:ci-policy
npm run architecture:check
npm run docs:ci
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
