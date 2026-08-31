import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const sandbox = mkdtempSync(path.join(tmpdir(), "gova-direct-domain-test-"));
process.env.GOVA_DIRECT_AGENT_DIR = sandbox;

async function main(): Promise<void> {
  const direct = await import("../direct/index");
  const {
    DIRECT_PROTOCOL_VERSION,
    DIRECT_LIMITS,
    ReplayCache,
    SessionStore,
    createBootstrapAuthRequest,
    validateAndGrantBootstrapSession,
    validateCapabilitySubset,
    operationRequiredCapabilities,
    validateRequestEnvelope,
    generateChallenge,
    generateEphemeralKeyPair,
    generateHostIdentityKeyPair,
    deriveSharedSecret,
    signData,
    verifyDataSignature,
    sortCandidates,
  } = direct;

  const now = Date.now();
  const replayDir = path.join(sandbox, "replay");
  const activeDir = path.join(sandbox, "active");
  const revokedDir = path.join(sandbox, "revoked");
  mkdirSync(replayDir, { recursive: true });
  mkdirSync(activeDir, { recursive: true });
  mkdirSync(revokedDir, { recursive: true });

  // Closed protocol validation.
  const envelope = {
    protocol: DIRECT_PROTOCOL_VERSION,
    sessionId: "sess_test_0001",
    requestId: "request-000001",
    sequence: 1,
    timestamp: new Date(now).toISOString(),
    nonce: "nonce-000001",
    type: "status",
    payload: {},
  } as const;
  assert.equal(validateRequestEnvelope(envelope).valid, true, "valid direct envelope is accepted");
  assert.equal(validateRequestEnvelope({ ...envelope, protocol: "bad" }).valid, false, "unknown protocol is rejected");
  assert.equal(validateRequestEnvelope({ ...envelope, type: "raw.shell" }).valid, false, "undocumented RPC types are rejected");

  // Capability model is explicit and cannot escalate to host-admin by default.
  assert.deepEqual(operationRequiredCapabilities("exec"), ["execute"]);
  assert.deepEqual(operationRequiredCapabilities("patch.apply", { targetMode: "main" }), ["mutate-main"]);
  const deniedHostAdmin = validateCapabilitySubset(["inspect", "host-admin"]);
  assert.equal(deniedHostAdmin.valid, false);
  assert.match(deniedHostAdmin.errors.join(" "), /host-admin/);

  // Standard cryptographic primitives interoperate in both directions.
  const left = generateEphemeralKeyPair();
  const right = generateEphemeralKeyPair();
  const leftSecret = deriveSharedSecret(left.privateKeyPem, right.publicKeyPem);
  const rightSecret = deriveSharedSecret(right.privateKeyPem, left.publicKeyPem);
  assert.equal(leftSecret.length, 32);
  assert.deepEqual(leftSecret, rightSecret, "X25519 + HKDF derives the same session key");

  const identity = generateHostIdentityKeyPair();
  const signedPayload = "gova-direct-test";
  const signature = signData(identity.privateKeyPem, signedPayload);
  assert.equal(verifyDataSignature(identity.publicKeyPem, signedPayload, signature), true);
  assert.equal(verifyDataSignature(identity.publicKeyPem, signedPayload + "-tampered", signature), false);

  const challengeA = generateChallenge();
  const challengeB = generateChallenge();
  assert.notEqual(challengeA, challengeB);
  assert.match(challengeA, /^ch_[a-f0-9]{48}$/);

  // Persistent replay cache survives a process-style reload.
  const replay = new ReplayCache(replayDir);
  replay.consume("bootstrap-0001", "request");
  assert.equal(replay.hasConsumed("bootstrap-0001"), true);
  assert.equal(new ReplayCache(replayDir).hasConsumed("bootstrap-0001"), true, "consumed bootstrap persists to disk");
  assert.equal(replay.checkAndRecordNonce("nonce-fresh-0001", now), true);
  assert.equal(replay.checkAndRecordNonce("nonce-fresh-0001", now), false, "nonce replay is rejected");
  assert.equal(replay.checkAndUpdateSequence("sess-seq", 1), true);
  assert.equal(replay.checkAndUpdateSequence("sess-seq", 1), false);
  assert.equal(replay.checkAndUpdateSequence("sess-seq", 0), false);
  assert.equal(replay.checkAndUpdateSequence("sess-seq", 2), true);

  // Session expiry and revocation are enforced from machine-local state.
  const sessionStore = new SessionStore(activeDir, revokedDir);
  sessionStore.createSession({
    sessionId: "sess-expiring",
    agentId: "chatgpt",
    bootstrapRequestId: "auth-expiring",
    consumedChallenge: "challenge-expiring",
    capabilities: ["inspect"],
    clientEphemeralPublicKey: left.publicKeyPem,
    serverEphemeralPublicKey: right.publicKeyPem,
    lifetimeMs: 100,
  }, now);
  assert.equal(sessionStore.validateActiveSession("sess-expiring", now + 50).agentId, "chatgpt");
  assert.throws(() => sessionStore.validateActiveSession("sess-expiring", now + 101), /maximum lifetime/);

  sessionStore.createSession({
    sessionId: "sess-revoke",
    agentId: "chatgpt",
    bootstrapRequestId: "auth-revoke",
    consumedChallenge: "challenge-revoke",
    capabilities: ["inspect"],
    clientEphemeralPublicKey: left.publicKeyPem,
    serverEphemeralPublicKey: right.publicKeyPem,
  }, now);
  assert.equal(sessionStore.revokeSession("sess-revoke", "test", now + 1), true);
  assert.throws(() => sessionStore.validateActiveSession("sess-revoke", now + 2), /revoked/);

  // Bootstrap authorization is fresh, host-bound, capability-bound and single-use.
  const authReplayDir = path.join(sandbox, "auth-replay");
  const authActiveDir = path.join(sandbox, "auth-active");
  const authRevokedDir = path.join(sandbox, "auth-revoked");
  const authReplay = new ReplayCache(authReplayDir);
  const authSessions = new SessionStore(authActiveDir, authRevokedDir);
  const authChallenge = generateChallenge();
  const authKey = generateEphemeralKeyPair();
  const request = createBootstrapAuthRequest({
    agentId: "chatgpt",
    hostId: "host-a",
    challenge: authChallenge,
    clientEphemeralPublicKey: authKey.publicKeyPem,
    requestedCapabilities: ["inspect", "execute", "coordinate"],
    now,
  });
  const granted = validateAndGrantBootstrapSession(request, {
    currentChallenge: authChallenge,
    hostId: "host-a",
    replayCache: authReplay,
    sessionStore: authSessions,
    now,
  });
  assert.equal(granted.valid, true, granted.errors.join("; "));
  assert.deepEqual(granted.session?.capabilities, ["inspect", "execute", "coordinate"]);
  assert.equal(validateAndGrantBootstrapSession(request, { currentChallenge: authChallenge, hostId: "host-a", replayCache: authReplay, sessionStore: authSessions, now: now + 1 }).valid, false, "bootstrap replay is rejected");

  const stale = createBootstrapAuthRequest({ hostId: "host-a", challenge: generateChallenge(), clientEphemeralPublicKey: authKey.publicKeyPem, now: now - DIRECT_LIMITS.bootstrapValidityMs - 1000 });
  assert.equal(validateAndGrantBootstrapSession(stale, { currentChallenge: stale.challenge, hostId: "host-a", replayCache: new ReplayCache(path.join(sandbox, "stale-replay")), sessionStore: new SessionStore(path.join(sandbox, "stale-active"), path.join(sandbox, "stale-revoked")), now }).valid, false, "stale bootstrap is rejected");

  // Candidate ordering prefers LAN over IPv6/STUN/public and removes duplicates.
  const expiry = new Date(now + 60_000).toISOString();
  const sorted = sortCandidates([
    { type: "public", address: "203.0.113.9", port: 1, protocol: "tcp", priority: 60, expiresAt: expiry },
    { type: "lan", address: "192.168.1.2", port: 1, protocol: "tcp", priority: 100, expiresAt: expiry },
    { type: "lan", address: "192.168.1.2", port: 1, protocol: "tcp", priority: 100, expiresAt: expiry },
    { type: "ipv6", address: "2001:db8::1", port: 1, protocol: "tcp", priority: 90, expiresAt: expiry },
  ]);
  assert.deepEqual(sorted.map((candidate) => candidate.type), ["lan", "ipv6", "public"]);

  const discoveryModule = await import("../host-discovery");
  const v2 = discoveryModule.createDeviceDiscoveryDocument({
    port: 48731,
    publicIp: "203.0.113.10",
    hostId: "host-a",
    directPort: 48732,
    serverKeyId: identity.serverKeyId,
    serverPublicKey: identity.publicKeyPem,
    challenge: challengeA,
    challengeExpiresAt: new Date(now + 600_000).toISOString(),
    capabilities: ["inspect", "execute"],
    candidates: [{ type: "lan", address: "192.168.1.2", port: 48732, protocol: "tcp", priority: 100, expiresAt: expiry }],
    generatedAt: new Date(now),
    addresses: [{ name: "eth0", address: "192.168.1.2", family: "IPv4", cidr: "192.168.1.2/24" }],
  });
  assert.equal(v2.schemaVersion, 2);
  assert.equal(v2.discoveryHttp.execution, false);
  assert.equal(v2.directAgent.protocol, "gova-direct/1");
  assert.equal(v2.directAgent.bootstrap.branch, "agent-request/chatgpt");
  const serializedDiscovery = JSON.stringify(v2);
  for (const forbidden of ["username", "cwd", "mac", "totalMemoryMb", "freeMemoryMb", "passwordEnv", "privateKey"]) {
    assert.equal(serializedDiscovery.includes(forbidden), false, `Host Discovery v2 must not publish ${forbidden}`);
  }

  console.log("@asol/local-agent-core direct domain: all checks passed.");
}

main().finally(() => rmSync(sandbox, { recursive: true, force: true }));
