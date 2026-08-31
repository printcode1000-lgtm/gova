import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const sandbox = mkdtempSync(path.join(tmpdir(), "gova-direct-transport-test-"));
process.env.GOVA_DIRECT_AGENT_DIR = sandbox;

async function main(): Promise<void> {
  const direct = await import("../direct/index");
  const {
    DirectAgentClient,
    DirectAgentServer,
    ReplayCache,
    SessionStore,
    createBootstrapAuthRequest,
    createSignedBootstrapGrant,
    generateChallenge,
    generateEphemeralKeyPair,
    hostIdentifier,
    loadOrCreateHostIdentityKey,
    validateAndGrantBootstrapSession,
    verifySignedBootstrapGrant,
  } = direct;

  const challenge = generateChallenge();
  const clientKeys = generateEphemeralKeyPair();
  const replayCache = new ReplayCache(path.join(sandbox, "replay"));
  const sessionStore = new SessionStore(path.join(sandbox, "active"), path.join(sandbox, "revoked"));
  const auth = createBootstrapAuthRequest({
    agentId: "chatgpt",
    hostId: hostIdentifier(),
    challenge,
    clientEphemeralPublicKey: clientKeys.publicKeyPem,
    requestedCapabilities: ["inspect", "execute", "coordinate"],
  });
  const granted = validateAndGrantBootstrapSession(auth, {
    currentChallenge: challenge,
    hostId: hostIdentifier(),
    replayCache,
    sessionStore,
  });
  assert.equal(granted.valid, true, granted.errors.join("; "));
  assert.ok(granted.session?.serverEphemeralPrivateKey?.includes("PRIVATE KEY"));

  const identity = loadOrCreateHostIdentityKey();
  const grant = createSignedBootstrapGrant(granted.session!, hostIdentifier(), identity);
  assert.equal(verifySignedBootstrapGrant(grant, identity.publicKeyPem), true);
  assert.equal(verifySignedBootstrapGrant({ ...grant, sessionId: `${grant.sessionId}x` }, identity.publicKeyPem), false);

  const server = new DirectAgentServer({ port: 0, bindHost: "127.0.0.1", sessionStore, replayCache: new ReplayCache(path.join(sandbox, "wire-replay")) });
  const bound = await server.start();
  const client = new DirectAgentClient();
  const handshake = await client.connect({
    host: "127.0.0.1",
    port: bound.port,
    sessionId: grant.sessionId,
    bootstrapRequestId: grant.requestId,
    clientKeyPair: clientKeys,
    bootstrapChallenge: challenge,
    serverEphemeralPublicKey: grant.serverEphemeralPublicKey,
    expectedHostId: grant.hostId,
    expectedServerKeyId: grant.serverKeyId,
    expectedServerIdentityPublicKey: identity.publicKeyPem,
  });
  assert.equal(handshake.status, "authenticated");
  const status = await client.status();
  assert.equal(typeof status.workspace, "object");
  await client.close();
  await server.stop();

  const fakeSession = {
    ...granted.session!,
    revoked: false,
    capabilities: ["execute"] as const,
  };
  const { executeExec } = await import("../direct/execution");
  await assert.rejects(
    executeExec(fakeSession as any, "deny-tool-test", { command: "agy --version" }, () => {}),
    /permanently forbidden/i,
  );

  console.log("@asol/local-agent-core direct transport: all checks passed.");
}

main().finally(() => rmSync(sandbox, { recursive: true, force: true }));
