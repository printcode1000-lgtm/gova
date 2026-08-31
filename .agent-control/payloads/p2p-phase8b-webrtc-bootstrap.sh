#!/usr/bin/env bash
set -euo pipefail

# Authorization request may carry only bounded WebRTC signaling metadata.
python3 - <<'PY'
from pathlib import Path
p=Path('packages/local-agent-core/src/direct/authorization.ts')
s=p.read_text()
if 'DirectWebRtcOffer' not in s:
    s=s.replace('import { ReplayCache } from "./replay-cache";', 'import { ReplayCache } from "./replay-cache";\nimport type { DirectWebRtcOffer } from "./webrtc-tunnel";\nimport { validateDirectWebRtcOffer } from "./webrtc-tunnel";')
s=s.replace('  expiresAt: string;\n}', '  expiresAt: string;\n  transportOffer?: DirectWebRtcOffer;\n}', 1)
marker='  // 9. Capability subset check\n'
validation='''  // 9. Optional WebRTC signaling metadata. It may select a transport, never carry commands/results.\n  if (req.transportOffer !== undefined) {\n    try { validateDirectWebRtcOffer(req.transportOffer); }\n    catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }\n  }\n\n'''
if validation not in s:
    s=s.replace(marker, validation+marker)
s=s.replace('  now?: number;\n}): DirectAuthRequest {', '  now?: number;\n  transportOffer?: DirectWebRtcOffer;\n}): DirectAuthRequest {')
s=s.replace('    expiresAt,\n  };', '    expiresAt,\n    ...(input.transportOffer ? { transportOffer: input.transportOffer } : {}),\n  };', 1)
p.write_text(s)
PY

# Export strict signaling validators from the tunnel implementation.
python3 - <<'PY'
from pathlib import Path
p=Path('packages/local-agent-core/src/direct/webrtc-tunnel.ts')
s=p.read_text()
s=s.replace('function validateSdp(sdp: string, kind: "offer" | "answer"): void {', 'export function validateDirectWebRtcSdp(sdp: string, kind: "offer" | "answer"): void {')
s=s.replace('validateSdp(offer.sdp, "offer")', 'validateDirectWebRtcSdp(offer.sdp, "offer")')
s=s.replace('validateSdp(sdp, "answer")', 'validateDirectWebRtcSdp(sdp, "answer")')
s=s.replace('validateSdp(sdp, "offer")', 'validateDirectWebRtcSdp(sdp, "offer")')
s=s.replace('validateSdp(answer.sdp, "answer")', 'validateDirectWebRtcSdp(answer.sdp, "answer")')
insert='''\nexport function validateDirectWebRtcOffer(value: unknown): asserts value is DirectWebRtcOffer {\n  if (!value || typeof value !== "object" || (value as DirectWebRtcOffer).kind !== DIRECT_WEBRTC_TUNNEL_KIND) {\n    throw new DirectAgentError("invalid-message", "Invalid WebRTC transport offer kind.");\n  }\n  validateDirectWebRtcSdp((value as DirectWebRtcOffer).sdp, "offer");\n}\n\nexport function validateDirectWebRtcAnswer(value: unknown): asserts value is DirectWebRtcAnswer {\n  if (!value || typeof value !== "object" || (value as DirectWebRtcAnswer).kind !== DIRECT_WEBRTC_TUNNEL_KIND) {\n    throw new DirectAgentError("invalid-message", "Invalid WebRTC transport answer kind.");\n  }\n  validateDirectWebRtcSdp((value as DirectWebRtcAnswer).sdp, "answer");\n}\n'''
needle='function closeSocket(socket: Socket | null): void {'
if 'validateDirectWebRtcOffer' not in s:
    s=s.replace(needle,insert+'\n'+needle)
p.write_text(s)
PY

# Include transport answer in the signed grant.
python3 - <<'PY'
from pathlib import Path
p=Path('packages/local-agent-core/src/direct/bootstrap.ts')
s=p.read_text()
if 'DirectWebRtcAnswer' not in s:
    s=s.replace('import type { DirectSession } from "./session";', 'import type { DirectSession } from "./session";\nimport type { DirectWebRtcAnswer } from "./webrtc-tunnel";')
s=s.replace('  expiresAt: string;\n  signature: string;', '  expiresAt: string;\n  transport?: DirectWebRtcAnswer;\n  signature: string;')
s=s.replace('    grant.expiresAt,\n  ]);', '    grant.expiresAt,\n    grant.transport ?? null,\n  ]);')
s=s.replace('  identity: HostIdentityKeyInfo,\n): DirectBootstrapGrant {', '  identity: HostIdentityKeyInfo,\n  transport?: DirectWebRtcAnswer,\n): DirectBootstrapGrant {')
s=s.replace('    expiresAt: session.expiresAt,\n  };', '    expiresAt: session.expiresAt,\n    ...(transport ? { transport } : {}),\n  };')
helper='''\nexport function attachSignedBootstrapTransport(\n  grant: DirectBootstrapGrant,\n  transport: DirectWebRtcAnswer,\n  identity: HostIdentityKeyInfo,\n): DirectBootstrapGrant {\n  const { signature: _oldSignature, ...base } = grant;\n  const unsigned: Omit<DirectBootstrapGrant, "signature"> = { ...base, transport };\n  return { ...unsigned, signature: signData(identity.privateKeyPem, bootstrapGrantSigningMessage(unsigned)) };\n}\n'''
needle='export function verifySignedBootstrapGrant('
if 'attachSignedBootstrapTransport' not in s:
    s=s.replace(needle,helper+'\n'+needle)
p.write_text(s)
PY

# Let the daemon enrich a just-authorized grant with its WebRTC answer before R2 publication.
python3 - <<'PY'
from pathlib import Path
p=Path('scripts/local-agent-direct-bootstrap.ts')
s=p.read_text()
if 'storeBootstrapGrant' not in s.split('} from "@asol/local-agent-core/direct";')[0]:
    s=s.replace('  rotateDiscoveryChallenge,', '  rotateDiscoveryChallenge,\n  storeBootstrapGrant,')
iface='''\nexport interface DirectBootstrapCycleOptions {\n  enhanceGrant?: (request: DirectAuthRequest, grant: DirectBootstrapGrant) => Promise<DirectBootstrapGrant>;\n}\n\n'''
if 'DirectBootstrapCycleOptions' not in s:
    s=s.replace('function git(args: string[]): string {',iface+'function git(args: string[]): string {')
s=s.replace('export async function runDirectBootstrapCycle(): Promise<number> {', 'export async function runDirectBootstrapCycle(options: DirectBootstrapCycleOptions = {}): Promise<number> {')
old='''    await publishGrant(result.grant);\n    rotateDiscoveryChallenge();\n    granted += 1;\n    console.log(JSON.stringify({ bootstrap: "granted", requestId, sessionId: result.grant.sessionId, expiresAt: result.grant.expiresAt }));'''
new='''    let grant = result.grant;\n    if (options.enhanceGrant) {\n      try {\n        grant = await options.enhanceGrant(entry.document as DirectAuthRequest, grant);\n        storeBootstrapGrant(grant);\n      } catch (error) {\n        sessionStore.revokeSession(grant.sessionId, "Direct transport negotiation failed");\n        console.error(JSON.stringify({ bootstrap: "transport-rejected", requestId, error: error instanceof Error ? error.message : String(error) }));\n        continue;\n      }\n    }\n    await publishGrant(grant);\n    rotateDiscoveryChallenge();\n    granted += 1;\n    console.log(JSON.stringify({ bootstrap: "granted", requestId, sessionId: grant.sessionId, expiresAt: grant.expiresAt, transport: grant.transport?.kind ?? "tls-tcp" }));'''
if old not in s:
    raise SystemExit('bootstrap grant publish block not found')
s=s.replace(old,new)
p.write_text(s)
PY

# Bind tunnel lifetime to daemon/session lifetime and invalidate sessions on daemon restart.
python3 - <<'PY'
from pathlib import Path
p=Path('scripts/local-agent-direct-daemon.ts')
s=p.read_text()
s=s.replace('  DIRECT_BOOTSTRAP_POLL_MS,', '  DIRECT_BOOTSTRAP_POLL_MS,\n  DirectWebRtcHostTunnelManager,\n  attachSignedBootstrapTransport,')
s=s.replace('const sessionStore = new SessionStore();', 'const sessionStore = new SessionStore();\nsessionStore.revokeAllSessions("Direct daemon restart invalidated prior transports");')
s=s.replace('const server = new DirectAgentServer({ port, bindHost: "0.0.0.0", sessionStore, replayCache });', 'const server = new DirectAgentServer({ port, bindHost: "0.0.0.0", sessionStore, replayCache });\nconst webRtcTunnels = new DirectWebRtcHostTunnelManager(port);')
s=s.replace('try { await runDirectBootstrapCycle(); bootstrapLastCycleAt = new Date().toISOString(); lastError = null; }', '''try {\n    await runDirectBootstrapCycle({\n      enhanceGrant: async (request, grant) => {\n        if (!request.transportOffer) return grant;\n        const answer = await webRtcTunnels.acceptOffer(grant.sessionId, request.transportOffer);\n        return attachSignedBootstrapTransport(grant, answer, identity);\n      },\n    });\n    bootstrapLastCycleAt = new Date().toISOString(); lastError = null;\n  }''')
s=s.replace('await server.stop();', 'webRtcTunnels.closeAll();\n  await server.stop();')
s=s.replace('const stateTimer = setInterval(persist, 30_000);', '''const stateTimer = setInterval(() => {\n  const active = new Set(sessionStore.listActiveSessions().map((session) => session.sessionId));\n  for (const sessionId of webRtcTunnels.activeSessionIds()) if (!active.has(sessionId)) webRtcTunnels.close(sessionId);\n  persist();\n}, 30_000);''')
p.write_text(s)
PY

cat > packages/local-agent-core/src/tests/direct-webrtc-bootstrap.test.ts <<'EOF'
import assert from "node:assert/strict";
import { generateHostIdentityKeyPair } from "../direct/crypto";
import { attachSignedBootstrapTransport, createSignedBootstrapGrant, verifySignedBootstrapGrant } from "../direct/bootstrap";
import type { DirectSession } from "../direct/session";
import { DIRECT_WEBRTC_TUNNEL_KIND } from "../direct/webrtc-tunnel";

const identity=generateHostIdentityKeyPair();
const now=new Date().toISOString();
const session:DirectSession={sessionId:"session_webrtc_signed",agentId:"chatgpt-sol",bootstrapRequestId:"auth_webrtc_signed",consumedChallenge:"challenge",capabilities:["inspect"],clientEphemeralPublicKey:"client",serverEphemeralPublicKey:"server",createdAt:now,expiresAt:new Date(Date.now()+60_000).toISOString(),lastActivityAt:now,revoked:false};
const base=createSignedBootstrapGrant(session,"test-host",identity);
assert.equal(verifySignedBootstrapGrant(base,identity.publicKeyPem),true);
const transport={kind:DIRECT_WEBRTC_TUNNEL_KIND,sdp:"v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n"};
const enriched=attachSignedBootstrapTransport(base,transport,identity);
assert.equal(enriched.transport?.kind,DIRECT_WEBRTC_TUNNEL_KIND);
assert.equal(verifySignedBootstrapGrant(enriched,identity.publicKeyPem),true);
const tampered={...enriched,transport:{...transport,sdp:transport.sdp+"a=x-tampered:1\r\n"}};
assert.equal(verifySignedBootstrapGrant(tampered,identity.publicKeyPem),false);
console.log("@asol/local-agent-core WebRTC bootstrap signing: all checks passed.");
EOF

python3 - <<'PY'
import json
from pathlib import Path
p=Path('package.json'); x=json.loads(p.read_text()); s=x['scripts']; old=s['test:local-agent-core']
if 'direct-webrtc-bootstrap.test.ts' not in old: s['test:local-agent-core']=old+' && npx tsx packages/local-agent-core/src/tests/direct-webrtc-bootstrap.test.ts'
p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
PY

cat >> docs/07-mobile-and-release/direct-p2p-agent.md <<'EOF'

### WebRTC signaling boundary

A bootstrap request may include a bounded WebRTC SDP offer. The host may return a bounded SDP answer inside the signed bootstrap grant. Both are rendezvous metadata only. The answer is covered by the persistent Ed25519 host signature, so a modified R2 object is rejected by the client. A daemon restart revokes prior sessions because their in-memory ICE/DTLS/SCTP transport cannot be resumed safely.
EOF

npm run test:local-agent-core
npm run typecheck
npm run architecture:docs
npm run docs:generate
npm run architecture:check
npm run docs:ci
