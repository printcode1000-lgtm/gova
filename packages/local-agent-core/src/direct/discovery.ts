import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { generateChallenge } from "./crypto";
import { DIRECT_LIMITS } from "./protocol";
import { DIRECT_FILE_MODE, directDiscoveryChallengePath, directRendezvousDir, ensureDirectDir } from "./paths";

export const DIRECT_AGENT_PORT_ENV = "GOVA_DIRECT_AGENT_PORT";
export const DEFAULT_DIRECT_AGENT_PORT = 48732;
export const DIRECT_DISCOVERY_TTL_MS = 10 * 60 * 1000;

export interface DirectDiscoveryChallenge {
  schemaVersion: 1;
  challenge: string;
  generatedAt: string;
  expiresAt: string;
}

export function resolveDirectAgentPort(env: NodeJS.ProcessEnv = process.env): number {
  const value = Number(env[DIRECT_AGENT_PORT_ENV] ?? DEFAULT_DIRECT_AGENT_PORT);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${DIRECT_AGENT_PORT_ENV} must be a TCP/UDP port number between 1 and 65535`);
  }
  return value;
}

export function loadOrRotateDiscoveryChallenge(now = Date.now(), ttlMs = DIRECT_DISCOVERY_TTL_MS): DirectDiscoveryChallenge {
  ensureDirectDir(directRendezvousDir());
  const filePath = directDiscoveryChallengePath();
  if (existsSync(filePath)) {
    try {
      const current = JSON.parse(readFileSync(filePath, "utf8")) as DirectDiscoveryChallenge;
      const expiresMs = Date.parse(current.expiresAt);
      if (
        current.schemaVersion === 1 &&
        current.challenge &&
        Number.isFinite(expiresMs) &&
        expiresMs - now > DIRECT_LIMITS.bootstrapValidityMs
      ) {
        return current;
      }
    } catch {
      // Replace corrupt or obsolete machine-local state.
    }
  }

  const next: DirectDiscoveryChallenge = {
    schemaVersion: 1,
    challenge: generateChallenge(),
    generatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };
  writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: DIRECT_FILE_MODE });
  return next;
}

export function rotateDiscoveryChallenge(now = Date.now(), ttlMs = DIRECT_DISCOVERY_TTL_MS): DirectDiscoveryChallenge {
  ensureDirectDir(directRendezvousDir());
  const next: DirectDiscoveryChallenge = {
    schemaVersion: 1,
    challenge: generateChallenge(),
    generatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };
  writeFileSync(directDiscoveryChallengePath(), `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: DIRECT_FILE_MODE });
  return next;
}
