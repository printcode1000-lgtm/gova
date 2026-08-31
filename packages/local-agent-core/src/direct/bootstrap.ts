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
