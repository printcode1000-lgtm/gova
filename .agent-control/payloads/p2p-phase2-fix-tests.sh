#!/usr/bin/env bash
set -euo pipefail

base_script="$(mktemp)"
git show origin/agent-request/chatgpt:.agent-control/payloads/p2p-phase2-host-discovery-v2.sh > "$base_script"
# Apply the source edits but run validation only after the legacy test has been migrated.
sed -i '/^npm run test:local-agent-core$/,$d' "$base_script"
bash "$base_script"
rm -f "$base_script"

python3 - <<'PY'
from pathlib import Path
p=Path('packages/local-agent-core/src/tests/index.test.ts')
s=p.read_text()
start=s.index('const discoveryDocument = createDeviceDiscoveryDocument({')
end=s.index('assert.equal(deviceDiscoveryAuthorized', start)
replacement='''const discoveryDocument = createDeviceDiscoveryDocument({
  port: 12345,
  publicIp: "203.0.113.10",
  hostId: "test-host",
  directPort: 48732,
  serverKeyId: "test-key-id",
  serverPublicKey: "-----BEGIN PUBLIC KEY-----\\ntest\\n-----END PUBLIC KEY-----",
  challenge: "ch_0123456789abcdef0123456789abcdef0123456789abcdef",
  challengeExpiresAt: "2026-08-31T00:10:00.000Z",
  capabilities: ["inspect"],
  candidates: [],
  generatedAt: new Date("2026-08-31T00:00:00.000Z"),
  addresses: [
    { name: "eth0", address: "192.168.1.10", family: "IPv4", cidr: "192.168.1.10/24" },
  ],
});
assert.equal(discoveryDocument.schemaVersion, 2);
assert.equal(discoveryDocument.discoveryHttp.execution, false);
assert.deepEqual(discoveryDocument.network.discoveryUrlCandidates, ["http://203.0.113.10:12345", "http://192.168.1.10:12345"]);
assert.equal(discoveryDocument.expiresAt, "2026-08-31T00:10:00.000Z");
'''
s=s[:start]+replacement+s[end:]
p.write_text(s)
PY

npm run test:local-agent-core
npm run typecheck
npm run docs:generate
npm run architecture:check
npm run docs:ci
