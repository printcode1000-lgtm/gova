#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
from pathlib import Path

# paths.ts: machine-local bootstrap grants
p=Path('packages/local-agent-core/src/direct/paths.ts')
s=p.read_text()
if 'directBootstrapResultsDir' not in s:
    s += '''\nexport function directBootstrapResultsDir(): string {\n  return path.join(directAgentDir(), "bootstrap-results");\n}\n'''
p.write_text(s)

# session.ts: keep the server ephemeral private key machine-local with the session.
p=Path('packages/local-agent-core/src/direct/session.ts')
s=p.read_text()
s=s.replace('  serverEphemeralPublicKey: string;\n  createdAt:', '  serverEphemeralPublicKey: string;\n  serverEphemeralPrivateKey?: string;\n  createdAt:')
s=s.replace('  serverEphemeralPublicKey: string;\n  lifetimeMs?: number;', '  serverEphemeralPublicKey: string;\n  serverEphemeralPrivateKey?: string;\n  lifetimeMs?: number;')
s=s.replace('      serverEphemeralPublicKey: input.serverEphemeralPublicKey,\n      createdAt,', '      serverEphemeralPublicKey: input.serverEphemeralPublicKey,\n      ...(input.serverEphemeralPrivateKey ? { serverEphemeralPrivateKey: input.serverEphemeralPrivateKey } : {}),\n      createdAt,')
p.write_text(s)

# authorization.ts: persist the X25519 server private half locally only.
p=Path('packages/local-agent-core/src/direct/authorization.ts')
s=p.read_text()
s=s.replace('      serverEphemeralPublicKey: serverEphemeral.publicKeyPem,\n    },', '      serverEphemeralPublicKey: serverEphemeral.publicKeyPem,\n      serverEphemeralPrivateKey: serverEphemeral.privateKeyPem,\n    },')
p.write_text(s)

# crypto.ts: shared-secret HMAC proof helpers.
p=Path('packages/local-agent-core/src/direct/crypto.ts')
s=p.read_text()
s=s.replace('  createHash,\n', '  createHash,\n  createHmac,\n')
s=s.replace('  sign,\n  verify,\n', '  sign,\n  timingSafeEqual,\n  verify,\n')
if 'export function directHandshakeProofMessage' not in s:
    s += '''\n\nexport function directHandshakeProofMessage(input: {\n  sessionId: string;\n  bootstrapRequestId: string;\n  challenge: string;\n  nonce: string;\n  clientEphemeralPublicKey: string;\n}): string {\n  return JSON.stringify([\n    "gova-direct-handshake-v1",\n    input.sessionId,\n    input.bootstrapRequestId,\n    input.challenge,\n    input.nonce,\n    computeKeyFingerprint(input.clientEphemeralPublicKey),\n  ]);\n}\n\nexport function createSharedSecretProof(sharedSecret: Buffer, message: string): string {\n  return createHmac("sha256", sharedSecret).update(message).digest("base64url");\n}\n\nexport function verifySharedSecretProof(sharedSecret: Buffer, message: string, proof: string): boolean {\n  let actual: Buffer;\n  try {\n    actual = Buffer.from(proof, "base64url");\n  } catch {\n    return false;\n  }\n  const expected = createHmac("sha256", sharedSecret).update(message).digest();\n  return actual.length === expected.length && timingSafeEqual(actual, expected);\n}\n\nexport function directServerIdentityProofMessage(input: {\n  challenge: string;\n  sessionId: string;\n  nonce: string;\n  serverEphemeralPublicKey: string;\n}): string {\n  return JSON.stringify([\n    "gova-direct-server-identity-v1",\n    input.challenge,\n    input.sessionId,\n    input.nonce,\n    computeKeyFingerprint(input.serverEphemeralPublicKey),\n  ]);\n}\n'''
p.write_text(s)

# protocol.ts: signature is mandatory.
p=Path('packages/local-agent-core/src/direct/protocol.ts')
s=p.read_text()
anchor='''      if (typeof p.clientEphemeralPublicKey !== "string" || !p.clientEphemeralPublicKey.includes("PUBLIC KEY")) {\n        return { valid: false, error: "handshake.request requires clientEphemeralPublicKey (PEM)." };\n      }\n      return { valid: true };'''
replacement='''      if (typeof p.clientEphemeralPublicKey !== "string" || !p.clientEphemeralPublicKey.includes("PUBLIC KEY")) {\n        return { valid: false, error: "handshake.request requires clientEphemeralPublicKey (PEM)." };\n      }\n      if (typeof p.signature !== "string" || p.signature.length < 32) {\n        return { valid: false, error: "handshake.request requires a shared-secret proof." };\n      }\n      return { valid: true };'''
if anchor not in s: raise SystemExit('protocol handshake validation anchor missing')
s=s.replace(anchor,replacement)
p.write_text(s)

# errors.ts: stable direct policy denial family.
p=Path('packages/local-agent-core/src/direct/errors.ts')
s=p.read_text()
if '"host-tool-denied"' not in s:
    s=s.replace('  "capability-denied",\n', '  "capability-denied",\n  "host-tool-denied",\n')
p.write_text(s)
PY

cat > packages/local-agent-core/src/direct/bootstrap.ts <<'EOF'
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { DirectCapability } from "./capabilities";
import type { HostIdentityKeyInfo } from "./crypto";
import { signData, verifyDataSignature } from "./crypto";
import { DIRECT_FILE_MODE, directBootstrapResultsDir, ensureDirectDir } from "./paths";
import type { DirectSession } from "./session";

export const DIRECT_AUTH_RESULT_PREFIX = "direct-auth-results";

export interface DirectBootstrapGrant {
  schemaVersion: 1;
  status: "granted";
  requestId: string;
  sessionId: string;
  agentId: string;
  hostId: string;
  serverKeyId: string;
  serverEphemeralPublicKey: string;
  capabilities: DirectCapability[];
  createdAt: string;
  expiresAt: string;
  signature: string;
}

function safeSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

export function directAuthResultKeyPrefix(hostId: string): string {
  return `${DIRECT_AUTH_RESULT_PREFIX}/${safeSegment(hostId)}`;
}

export function directAuthResultKey(hostId: string, requestId: string): string {
  return `${directAuthResultKeyPrefix(hostId)}/${safeSegment(requestId)}.json`;
}

export function bootstrapGrantSigningMessage(grant: Omit<DirectBootstrapGrant, "signature">): string {
  return JSON.stringify([
    "gova-direct-bootstrap-grant-v1",
    grant.requestId,
    grant.sessionId,
    grant.agentId,
    grant.hostId,
    grant.serverKeyId,
    grant.serverEphemeralPublicKey,
    grant.capabilities,
    grant.createdAt,
    grant.expiresAt,
  ]);
}

export function createSignedBootstrapGrant(
  session: DirectSession,
  hostId: string,
  identity: HostIdentityKeyInfo,
): DirectBootstrapGrant {
  const unsigned: Omit<DirectBootstrapGrant, "signature"> = {
    schemaVersion: 1,
    status: "granted",
    requestId: session.bootstrapRequestId,
    sessionId: session.sessionId,
    agentId: session.agentId,
    hostId,
    serverKeyId: identity.serverKeyId,
    serverEphemeralPublicKey: session.serverEphemeralPublicKey,
    capabilities: [...session.capabilities],
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  };
  return { ...unsigned, signature: signData(identity.privateKeyPem, bootstrapGrantSigningMessage(unsigned)) };
}

export function verifySignedBootstrapGrant(grant: DirectBootstrapGrant, expectedIdentityPublicKey: string): boolean {
  const { signature, ...unsigned } = grant;
  return verifyDataSignature(expectedIdentityPublicKey, bootstrapGrantSigningMessage(unsigned), signature);
}

function resultPath(requestId: string): string {
  const safe = requestId.replace(/[^A-Za-z0-9._-]+/g, "_");
  return path.join(ensureDirectDir(directBootstrapResultsDir()), `${safe}.json`);
}

export function storeBootstrapGrant(grant: DirectBootstrapGrant): void {
  writeFileSync(resultPath(grant.requestId), `${JSON.stringify(grant, null, 2)}\n`, { encoding: "utf8", mode: DIRECT_FILE_MODE });
}

export function readStoredBootstrapGrant(requestId: string): DirectBootstrapGrant | null {
  const file = resultPath(requestId);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as DirectBootstrapGrant;
  } catch {
    return null;
  }
}
EOF

cat > packages/local-agent-core/src/direct/bootstrap-watcher.ts <<'EOF'
import type { HostIdentityKeyInfo } from "./crypto";
import { createSignedBootstrapGrant, storeBootstrapGrant, type DirectBootstrapGrant } from "./bootstrap";
import {
  validateAndGrantBootstrapSession,
  type DirectAuthValidationContext,
} from "./authorization";

export interface BootstrapProcessResult {
  valid: boolean;
  errors: string[];
  grant?: DirectBootstrapGrant;
}

export function processBootstrapDocument(
  document: unknown,
  context: DirectAuthValidationContext & { hostIdentity: HostIdentityKeyInfo },
): BootstrapProcessResult {
  const validation = validateAndGrantBootstrapSession(document, context);
  if (!validation.valid || !validation.session) {
    return { valid: false, errors: validation.errors };
  }
  const grant = createSignedBootstrapGrant(validation.session, context.hostId, context.hostIdentity);
  storeBootstrapGrant(grant);
  return { valid: true, errors: [], grant };
}
EOF

python3 - <<'PY'
from pathlib import Path
p=Path('packages/local-agent-core/src/direct/index.ts')
s=p.read_text()
for line in ['export * from "./bootstrap";\n','export * from "./bootstrap-watcher";\n']:
    if line not in s: s += line
p.write_text(s)

# Host Discovery advertises the predictable bootstrap result prefix.
p=Path('packages/local-agent-core/src/host-discovery.ts')
s=p.read_text()
if 'directAuthResultKeyPrefix' not in s:
    s=s.replace('import { DIRECT_PROTOCOL_VERSION } from "./direct/protocol";','import { DIRECT_PROTOCOL_VERSION } from "./direct/protocol";\nimport { directAuthResultKeyPrefix } from "./direct/bootstrap";')
s=s.replace('      challengeExpiresAt: string;\n    };', '      challengeExpiresAt: string;\n      resultKeyPrefix: string;\n    };')
s=s.replace('challengeExpiresAt: input.challengeExpiresAt },', 'challengeExpiresAt: input.challengeExpiresAt, resultKeyPrefix: directAuthResultKeyPrefix(input.hostId) },')
p.write_text(s)

# discovery.ts: explicit post-grant rotation helper.
p=Path('packages/local-agent-core/src/direct/discovery.ts')
s=p.read_text()
if 'export function rotateDiscoveryChallenge' not in s:
    s += '''\nexport function rotateDiscoveryChallenge(now = Date.now(), ttlMs = DIRECT_DISCOVERY_TTL_MS): DirectDiscoveryChallenge {\n  ensureDirectDir(directRendezvousDir());\n  const next: DirectDiscoveryChallenge = {\n    schemaVersion: 1,\n    challenge: generateChallenge(),\n    generatedAt: new Date(now).toISOString(),\n    expiresAt: new Date(now + ttlMs).toISOString(),\n  };\n  writeFileSync(directDiscoveryChallengePath(), `${JSON.stringify(next, null, 2)}\\n`, { encoding: "utf8", mode: DIRECT_FILE_MODE });\n  return next;\n}\n'''
p.write_text(s)
PY

cat > scripts/local-agent-direct-bootstrap.ts <<'EOF'
import { spawnSync } from "node:child_process";

import {
  DIRECT_AUTH_BRANCH,
  DIRECT_AUTH_DIRECTORY,
  ReplayCache,
  SessionStore,
  directAuthResultKey,
  hostIdentifier,
  loadOrCreateHostIdentityKey,
  loadOrRotateDiscoveryChallenge,
  processBootstrapDocument,
  readStoredBootstrapGrant,
  rotateDiscoveryChallenge,
  type DirectAuthRequest,
  type DirectBootstrapGrant,
} from "@asol/local-agent-core/direct";
import {
  createOtaR2Client,
  loadOtaEnvironment,
  putOtaObject,
} from "@asol/ota-core/publishing";

function git(args: string[]): string {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || `git ${args.join(" ")} failed`).trim());
  return result.stdout;
}

function remoteAuthDocuments(): Array<{ path: string; document: unknown }> {
  git(["fetch", "--quiet", "origin", DIRECT_AUTH_BRANCH]);
  const ref = `origin/${DIRECT_AUTH_BRANCH}`;
  const names = git(["ls-tree", "-r", "--name-only", ref, "--", DIRECT_AUTH_DIRECTORY])
    .split("\n")
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${DIRECT_AUTH_DIRECTORY}/`) && value.endsWith(".json"));
  const documents: Array<{ path: string; document: unknown }> = [];
  for (const file of names) {
    try {
      documents.push({ path: file, document: JSON.parse(git(["show", `${ref}:${file}`])) });
    } catch (error) {
      console.error(JSON.stringify({ bootstrap: "rejected-json", file, error: error instanceof Error ? error.message : String(error) }));
    }
  }
  return documents;
}

async function publishGrant(grant: DirectBootstrapGrant): Promise<void> {
  loadOtaEnvironment();
  await putOtaObject(
    createOtaR2Client(),
    directAuthResultKey(grant.hostId, grant.requestId),
    `${JSON.stringify(grant, null, 2)}\n`,
    "application/json",
    "no-store",
  );
}

async function cycle(): Promise<number> {
  const hostId = hostIdentifier();
  const identity = loadOrCreateHostIdentityKey();
  const replayCache = new ReplayCache();
  const sessionStore = new SessionStore();
  let granted = 0;

  for (const entry of remoteAuthDocuments()) {
    const requestId = (entry.document as Partial<DirectAuthRequest>)?.requestId;
    if (typeof requestId !== "string") continue;

    const stored = readStoredBootstrapGrant(requestId);
    if (stored && Date.parse(stored.expiresAt) > Date.now()) {
      await publishGrant(stored);
      continue;
    }
    if (replayCache.hasConsumed(requestId)) continue;

    const challenge = loadOrRotateDiscoveryChallenge();
    const result = processBootstrapDocument(entry.document, {
      currentChallenge: challenge.challenge,
      hostId,
      replayCache,
      sessionStore,
      hostIdentity: identity,
      allowedAgentIds: ["chatgpt", "chatgpt-sol"],
    });
    if (!result.valid || !result.grant) {
      console.error(JSON.stringify({ bootstrap: "rejected", requestId, errors: result.errors }));
      continue;
    }
    await publishGrant(result.grant);
    rotateDiscoveryChallenge();
    granted += 1;
    console.log(JSON.stringify({ bootstrap: "granted", requestId, sessionId: result.grant.sessionId, expiresAt: result.grant.expiresAt }));
  }
  return granted;
}

async function main(): Promise<void> {
  const once = process.argv.includes("--once");
  const pollArg = process.argv.find((value) => value.startsWith("--poll-ms="));
  const pollMs = Math.max(1000, Number(pollArg?.split("=")[1] ?? 5000));
  do {
    try { await cycle(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); }
    if (once) return;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  } while (true);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
EOF

python3 - <<'PY'
from pathlib import Path

# transport.ts: real X25519/HMAC proof + nonce/sequence replay checks + Ed25519 server identity proof.
p=Path('packages/local-agent-core/src/direct/transport.ts')
s=p.read_text()
s=s.replace('import { generateOrLoadTlsCredentials, loadOrCreateHostIdentityKey, signData, TlsCredentials } from "./crypto";', 'import { createSharedSecretProof, deriveSharedSecret, directHandshakeProofMessage, directServerIdentityProofMessage, generateOrLoadTlsCredentials, loadOrCreateHostIdentityKey, signData, verifySharedSecretProof, TlsCredentials } from "./crypto";')
old='''            if (validSession.bootstrapRequestId !== payload.bootstrapRequestId) {\n              throw new DirectAgentError("unauthorized", "Bootstrap request ID does not match session grant.");\n            }\n\n            session = validSession;\n            const identityKey = loadOrCreateHostIdentityKey();\n            const challengeSignData = `${session.consumedChallenge}:${session.sessionId}:${req.nonce}`;\n            const serverSig = signData(identityKey.privateKeyPem, challengeSignData);'''
new='''            if (validSession.bootstrapRequestId !== payload.bootstrapRequestId) {\n              throw new DirectAgentError("unauthorized", "Bootstrap request ID does not match session grant.");\n            }\n            if (payload.clientEphemeralPublicKey !== validSession.clientEphemeralPublicKey) {\n              throw new DirectAgentError("unauthorized", "Client ephemeral key does not match the GitHub-authorized bootstrap key.");\n            }\n            if (!validSession.serverEphemeralPrivateKey) {\n              throw new DirectAgentError("unauthorized", "Session is missing its machine-local server ephemeral key.");\n            }\n            const timestampMs = Date.parse(req.timestamp);\n            if (!this.options.replayCache.checkAndRecordNonce(req.nonce, timestampMs)) {\n              throw new DirectAgentError("replay-detected", "Handshake nonce is duplicated or stale.");\n            }\n            if (!this.options.replayCache.checkAndUpdateSequence(validSession.sessionId, req.sequence)) {\n              throw new DirectAgentError("replay-detected", "Handshake sequence is not strictly increasing.");\n            }\n            const sharedSecret = deriveSharedSecret(validSession.serverEphemeralPrivateKey, validSession.clientEphemeralPublicKey);\n            const proofMessage = directHandshakeProofMessage({\n              sessionId: validSession.sessionId,\n              bootstrapRequestId: validSession.bootstrapRequestId,\n              challenge: validSession.consumedChallenge,\n              nonce: req.nonce,\n              clientEphemeralPublicKey: validSession.clientEphemeralPublicKey,\n            });\n            if (!verifySharedSecretProof(sharedSecret, proofMessage, payload.signature)) {\n              throw new DirectAgentError("unauthorized", "Client failed X25519 shared-secret proof.");\n            }\n\n            session = validSession;\n            const identityKey = loadOrCreateHostIdentityKey();\n            const challengeSignData = directServerIdentityProofMessage({\n              challenge: session.consumedChallenge,\n              sessionId: session.sessionId,\n              nonce: req.nonce,\n              serverEphemeralPublicKey: session.serverEphemeralPublicKey,\n            });\n            const serverSig = signData(identityKey.privateKeyPem, challengeSignData);'''
if old not in s: raise SystemExit('transport handshake anchor missing')
s=s.replace(old,new)
old2='''          if (!this.options.replayCache.checkAndRecordNonce(req.nonce, timestampMs)) {\n            throw new DirectAgentError("replay-detected", `Duplicate or stale nonce detected: ${req.nonce}`);\n          }\n\n          // Capability check'''
new2='''          if (!this.options.replayCache.checkAndRecordNonce(req.nonce, timestampMs)) {\n            throw new DirectAgentError("replay-detected", `Duplicate or stale nonce detected: ${req.nonce}`);\n          }\n          if (!this.options.replayCache.checkAndUpdateSequence(session.sessionId, req.sequence)) {\n            throw new DirectAgentError("replay-detected", "Request sequence is not strictly increasing.");\n          }\n\n          // Capability check'''
if old2 not in s: raise SystemExit('transport replay anchor missing')
s=s.replace(old2,new2)
p.write_text(s)

# client.ts: compute proof and pin server Ed25519 identity advertised by Host Discovery.
p=Path('packages/local-agent-core/src/direct/client.ts')
s=p.read_text()
s=s.replace('import { EphemeralKeyPair, generateEphemeralKeyPair, generateNonce, generateRequestId } from "./crypto";', 'import { createSharedSecretProof, deriveSharedSecret, directHandshakeProofMessage, directServerIdentityProofMessage, EphemeralKeyPair, generateEphemeralKeyPair, generateNonce, generateRequestId, verifyDataSignature } from "./crypto";')
s=s.replace('''  clientKeyPair?: EphemeralKeyPair;\n  rejectUnauthorized?: boolean;''','''  clientKeyPair?: EphemeralKeyPair;\n  bootstrapChallenge: string;\n  serverEphemeralPublicKey: string;\n  expectedHostId: string;\n  expectedServerKeyId: string;\n  expectedServerIdentityPublicKey: string;\n  rejectUnauthorized?: boolean;''')
old='''            const handshakeReq: DirectRequestEnvelope<DirectHandshakeRequestPayload> = {\n              protocol: DIRECT_PROTOCOL_VERSION,\n              sessionId: this.sessionId,\n              requestId: generateRequestId(),\n              sequence: this.sequence++,\n              timestamp: new Date().toISOString(),\n              nonce: generateNonce(),\n              type: "handshake.request",\n              payload: {\n                bootstrapRequestId: options.bootstrapRequestId,\n                sessionId: this.sessionId,\n                clientEphemeralPublicKey: this.keyPair.publicKeyPem,\n                signature: "ephemeral-sig",\n              },\n            };\n\n            const response = await this.sendRequest<DirectHandshakeResponsePayload>(handshakeReq);\n            resolve(response);'''
new='''            const nonce = generateNonce();\n            const sharedSecret = deriveSharedSecret(this.keyPair.privateKeyPem, options.serverEphemeralPublicKey);\n            const proofMessage = directHandshakeProofMessage({\n              sessionId: this.sessionId,\n              bootstrapRequestId: options.bootstrapRequestId,\n              challenge: options.bootstrapChallenge,\n              nonce,\n              clientEphemeralPublicKey: this.keyPair.publicKeyPem,\n            });\n            const handshakeReq: DirectRequestEnvelope<DirectHandshakeRequestPayload> = {\n              protocol: DIRECT_PROTOCOL_VERSION,\n              sessionId: this.sessionId,\n              requestId: generateRequestId(),\n              sequence: this.sequence++,\n              timestamp: new Date().toISOString(),\n              nonce,\n              type: "handshake.request",\n              payload: {\n                bootstrapRequestId: options.bootstrapRequestId,\n                sessionId: this.sessionId,\n                clientEphemeralPublicKey: this.keyPair.publicKeyPem,\n                signature: createSharedSecretProof(sharedSecret, proofMessage),\n              },\n            };\n\n            const response = await this.sendRequest<DirectHandshakeResponsePayload>(handshakeReq);\n            if (response.sessionId !== this.sessionId || response.serverIdentity.hostId !== options.expectedHostId || response.serverIdentity.serverKeyId !== options.expectedServerKeyId) {\n              throw new DirectAgentError("unauthorized", "Server identity does not match Host Discovery bootstrap metadata.");\n            }\n            const serverProofMessage = directServerIdentityProofMessage({\n              challenge: options.bootstrapChallenge,\n              sessionId: this.sessionId,\n              nonce,\n              serverEphemeralPublicKey: options.serverEphemeralPublicKey,\n            });\n            if (!verifyDataSignature(options.expectedServerIdentityPublicKey, serverProofMessage, response.serverIdentity.signature)) {\n              throw new DirectAgentError("unauthorized", "Server Ed25519 identity proof failed.");\n            }\n            resolve(response);'''
if old not in s: raise SystemExit('client handshake anchor missing')
s=s.replace(old,new)
p.write_text(s)

# execution.ts: permanent host-tool policy and memory admission on direct exec.
p=Path('packages/local-agent-core/src/direct/execution.ts')
s=p.read_text()
if 'from "../host-tools"' not in s:
    s=s.replace('import { git, gitSoft, runCapture } from "../git";','import { git, gitSoft, runCapture } from "../git";\nimport { assertHostToolCommandAllowed, envWithHostToolShims } from "../host-tools";\nimport { jobReserveMb, waitForAdmission } from "../admission";')
anchor='''  const targetDir = resolveTargetDirectory(session, payload.cwd, payload.worktree);\n  const timeoutMs = Math.min(payload.timeoutMs ?? DIRECT_LIMITS.defaultExecTimeoutMs, DIRECT_LIMITS.maxExecTimeoutMs);\n  const startedAt = Date.now();'''
replacement='''  try {\n    assertHostToolCommandAllowed(payload.command);\n  } catch (error) {\n    throw new DirectAgentError("host-tool-denied", error instanceof Error ? error.message : String(error));\n  }\n\n  const targetDir = resolveTargetDirectory(session, payload.cwd, payload.worktree);\n  const timeoutMs = Math.min(payload.timeoutMs ?? DIRECT_LIMITS.defaultExecTimeoutMs, DIRECT_LIMITS.maxExecTimeoutMs);\n  const startedAt = Date.now();\n  const operation = new OperationLog({\n    requestId, agentId: session.agentId, workflow: "direct-agent", targetMode: "direct-exec",\n    targetRef: "main", runId: requestId, verification: "direct", patchProvided: false, shellCommandProvided: true,\n    executionTarget: payload.worktree ? "isolated-worktree" : "canonical-host",\n  });\n  const admission = waitForAdmission();\n  operation.record.admissionWaitMs = admission.waitedMs;\n  if (!admission.admitted) {\n    operation.failAs("admission");\n    operation.write("failed", 1);\n    throw new DirectAgentError("memory-admission-denied", admission.reason ?? "Direct execution was not admitted.", undefined, true);\n  }\n  operation.record.reservedMb = jobReserveMb();\n  operation.record.admittedAt = new Date().toISOString();\n  operation.record.mutationStarted = true;\n  operation.write("running");'''
if anchor not in s: raise SystemExit('exec admission anchor missing')
s=s.replace(anchor,replacement)
s=s.replace('''        env: {\n          ...process.env,\n          ...(payload.env ?? {}),\n          GOVA_DIRECT_SESSION_ID: session.sessionId,\n          GOVA_DIRECT_AGENT_ID: session.agentId,\n        },''','''        env: envWithHostToolShims({\n          ...process.env,\n          ...(payload.env ?? {}),\n          GOVA_DIRECT_SESSION_ID: session.sessionId,\n          GOVA_DIRECT_AGENT_ID: session.agentId,\n        }),''')
s=s.replace('''      reject(new DirectAgentError("internal-error", `Failed to spawn process: ${String(err)}`));''','''      operation.write("failed", 1);\n      reject(new DirectAgentError("internal-error", `Failed to spawn process: ${String(err)}`));''')
s=s.replace('''      reject(new DirectAgentError("internal-error", `Child process error: ${err.message}`));''','''      operation.write("failed", 1);\n      reject(new DirectAgentError("internal-error", `Child process error: ${err.message}`));''')
s=s.replace('''      const exitCode = signal ? 128 + 15 : code ?? 0;\n\n      if (abortSignal?.aborted) {''','''      const exitCode = signal ? 128 + 15 : code ?? 0;\n      operation.write(exitCode === 0 ? "success" : "failed", exitCode);\n\n      if (abortSignal?.aborted) {''')
p.write_text(s)
PY

cat > packages/local-agent-core/src/tests/direct-transport.test.ts <<'EOF'
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
EOF

node <<'NODE'
const fs=require('node:fs');
const p='package.json';
const pkg=JSON.parse(fs.readFileSync(p,'utf8'));
pkg.scripts['test:local-agent-core']='npx tsx packages/local-agent-core/src/tests/index.test.ts && npx tsx packages/local-agent-core/src/tests/direct.test.ts && npx tsx packages/local-agent-core/src/tests/direct-transport.test.ts';
pkg.scripts['local-agent:direct:bootstrap']='npx tsx scripts/local-agent-direct-bootstrap.ts';
fs.writeFileSync(p, JSON.stringify(pkg,null,2)+'\n');
NODE

npm run test:local-agent-core
npm run typecheck
npm run architecture:docs
npm run docs:generate
npm run architecture:check
npm run docs:ci
