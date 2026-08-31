import { chmodSync, existsSync, mkdirSync } from "node:fs";
import { hostname } from "node:os";
import path from "node:path";

import { localRootDir, workspaceDir } from "../paths";

/**
 * Machine-local filesystem layout for Gova Direct P2P Agent.
 *
 * All runtime state lives exclusively under `<workspace>/.local/direct-agent`,
 * which is gitignored and protected with strict 0700 / 0600 permissions.
 * Active secrets, private identity keys, and active session tokens never enter Git.
 */

export const DIRECT_DIR_MODE = 0o700;
export const DIRECT_FILE_MODE = 0o600;
export const DIRECT_PUBLIC_FILE_MODE = 0o644;

export function directAgentDir(): string {
  return process.env.GOVA_DIRECT_AGENT_DIR?.trim() || path.join(localRootDir(), "direct-agent");
}

export function directIdentityDir(): string {
  return path.join(directAgentDir(), "identity");
}

export function directIdentityKeyPath(): string {
  return path.join(directIdentityDir(), "server.key");
}

export function directIdentityPubPath(): string {
  return path.join(directIdentityDir(), "server.pub");
}

export function directIdentityTlsKeyPath(): string {
  return path.join(directIdentityDir(), "tls.key");
}

export function directIdentityTlsCertPath(): string {
  return path.join(directIdentityDir(), "tls.crt");
}

export const directIdentityCertPath = directIdentityTlsCertPath;

export function directSessionsDir(): string {
  return path.join(directAgentDir(), "sessions");
}

export function directActiveSessionsDir(): string {
  return path.join(directSessionsDir(), "active");
}

export function directRevokedSessionsDir(): string {
  return path.join(directSessionsDir(), "revoked");
}

export function directConsumedBootstrapDir(): string {
  return path.join(directSessionsDir(), "consumed-bootstrap");
}

export function directLogsDir(): string {
  return path.join(directAgentDir(), "logs");
}

export function directOperationLogsDir(): string {
  return path.join(directLogsDir(), "operations");
}

export function directSessionLogsDir(): string {
  return path.join(directLogsDir(), "sessions");
}

export function directRendezvousDir(): string {
  return path.join(directAgentDir(), "rendezvous");
}

export function directStatePath(): string {
  return path.join(directAgentDir(), "state.json");
}

export function directAuthRequestsDir(root = workspaceDir()): string {
  return path.join(root, ".agent-control", "direct-auth");
}

export function hostIdentifier(): string {
  const custom = process.env.GOVA_HOST_ID?.trim();
  if (custom) return custom;
  const name = hostname().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return name || "gova-host";
}

/**
 * Ensure a directory exists with strict 0700 permissions.
 */
export function ensureDirectDir(dirPath: string): string {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true, mode: DIRECT_DIR_MODE });
  }
  try {
    chmodSync(dirPath, DIRECT_DIR_MODE);
  } catch {
    // Best effort on platforms where chmod may have restrictions
  }
  return dirPath;
}

export function directDiscoveryChallengePath(): string {
  return path.join(directRendezvousDir(), "discovery-challenge.json");
}
