#!/usr/bin/env bash
set -euo pipefail

cat >> packages/local-agent-core/src/direct/paths.ts <<'EOF'

export function directDiscoveryChallengePath(): string {
  return path.join(directRendezvousDir(), "discovery-challenge.json");
}
EOF

cat > packages/local-agent-core/src/direct/discovery.ts <<'EOF'
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
EOF

python3 - <<'PY'
from pathlib import Path
p=Path('packages/local-agent-core/src/direct/index.ts')
s=p.read_text()
if 'export * from "./discovery";' not in s:
    s=s.replace('export * from "./crypto";\n','export * from "./crypto";\nexport * from "./discovery";\n')
p.write_text(s)
PY

cat > packages/local-agent-core/src/host-discovery.ts <<'EOF'
import { arch, hostname, networkInterfaces, platform, release } from "node:os";

import type { DirectCandidate } from "./direct/candidates";
import type { DirectCapability } from "./direct/capabilities";
import { DIRECT_AUTH_BRANCH, DIRECT_AUTH_DIRECTORY } from "./direct/authorization";
import { DIRECT_PROTOCOL_VERSION } from "./direct/protocol";

export const DEVICE_DISCOVERY_PORT_ENV = "ASOL_DEVICE_DISCOVERY_PORT";
export const DEVICE_DISCOVERY_PASSWORD_ENV = "ASOL_DEVICE_DISCOVERY_PORT_PASSWORD";
export const DEVICE_DISCOVERY_R2_KEY_ENV = "ASOL_DEVICE_DISCOVERY_R2_KEY";
export const DEFAULT_DEVICE_DISCOVERY_PORT = 48731;
export const DEFAULT_DEVICE_DISCOVERY_R2_KEY_PREFIX = "host-discovery";
export const DEVICE_DISCOVERY_TTL_MS = 10 * 60 * 1000;

export interface DeviceDiscoveryAddress {
  name: string;
  address: string;
  family: string;
  cidr: string | null;
}

export interface DeviceDiscoveryConfig {
  port: number;
  password: string;
  r2Key: string;
}

export interface DeviceDiscoveryDocument {
  schemaVersion: 2;
  generatedAt: string;
  expiresAt: string;
  host: {
    hostId: string;
    hostname: string;
    platform: NodeJS.Platform;
    arch: string;
    release: string;
    node: string;
  };
  network: {
    publicIp: string | null;
    addresses: DeviceDiscoveryAddress[];
    discoveryUrlCandidates: string[];
  };
  discoveryHttp: {
    number: number;
    protocol: "http";
    bindHost: "0.0.0.0";
    auth: "x-asol-port-password";
    execution: false;
  };
  directAgent: {
    protocol: typeof DIRECT_PROTOCOL_VERSION;
    transport: "tls-tcp";
    port: number;
    serverKeyId: string;
    serverPublicKey: string;
    bootstrap: {
      branch: typeof DIRECT_AUTH_BRANCH;
      directory: typeof DIRECT_AUTH_DIRECTORY;
      challenge: string;
      challengeExpiresAt: string;
    };
    capabilities: DirectCapability[];
    candidates: DirectCandidate[];
  };
}

function safeIdentifier(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown-host";
}

export function defaultDeviceDiscoveryR2Key(host = hostname()): string {
  return `${DEFAULT_DEVICE_DISCOVERY_R2_KEY_PREFIX}/${safeIdentifier(host)}.json`;
}

export function resolveDeviceDiscoveryConfig(env: NodeJS.ProcessEnv = process.env): DeviceDiscoveryConfig {
  const port = Number(env[DEVICE_DISCOVERY_PORT_ENV] ?? DEFAULT_DEVICE_DISCOVERY_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${DEVICE_DISCOVERY_PORT_ENV} must be a TCP port number between 1 and 65535`);
  }
  const password = env[DEVICE_DISCOVERY_PASSWORD_ENV];
  if (!password) throw new Error(`${DEVICE_DISCOVERY_PASSWORD_ENV} is required`);
  return { port, password, r2Key: env[DEVICE_DISCOVERY_R2_KEY_ENV] || defaultDeviceDiscoveryR2Key() };
}

export function collectDeviceDiscoveryAddresses(): DeviceDiscoveryAddress[] {
  const addresses: DeviceDiscoveryAddress[] = [];
  for (const [name, infos] of Object.entries(networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.internal) continue;
      addresses.push({ name, address: info.address, family: info.family, cidr: info.cidr ?? null });
    }
  }
  return addresses.sort((a, b) => `${a.name}:${a.address}`.localeCompare(`${b.name}:${b.address}`));
}

export function createDeviceDiscoveryDocument(input: {
  port: number;
  publicIp: string | null;
  hostId: string;
  directPort: number;
  serverKeyId: string;
  serverPublicKey: string;
  challenge: string;
  challengeExpiresAt: string;
  capabilities: DirectCapability[];
  candidates: DirectCandidate[];
  generatedAt?: Date;
  addresses?: DeviceDiscoveryAddress[];
}): DeviceDiscoveryDocument {
  const generatedAt = input.generatedAt ?? new Date();
  const expiresAt = new Date(generatedAt.getTime() + DEVICE_DISCOVERY_TTL_MS);
  const addresses = input.addresses ?? collectDeviceDiscoveryAddresses();
  const urls = new Set<string>();
  if (input.publicIp) urls.add(`http://${input.publicIp}:${input.port}`);
  for (const item of addresses) if (item.family === "IPv4") urls.add(`http://${item.address}:${input.port}`);

  return {
    schemaVersion: 2,
    generatedAt: generatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    host: {
      hostId: input.hostId,
      hostname: hostname(),
      platform: platform(),
      arch: arch(),
      release: release(),
      node: process.version,
    },
    network: { publicIp: input.publicIp, addresses, discoveryUrlCandidates: [...urls] },
    discoveryHttp: {
      number: input.port,
      protocol: "http",
      bindHost: "0.0.0.0",
      auth: "x-asol-port-password",
      execution: false,
    },
    directAgent: {
      protocol: DIRECT_PROTOCOL_VERSION,
      transport: "tls-tcp",
      port: input.directPort,
      serverKeyId: input.serverKeyId,
      serverPublicKey: input.serverPublicKey,
      bootstrap: {
        branch: DIRECT_AUTH_BRANCH,
        directory: DIRECT_AUTH_DIRECTORY,
        challenge: input.challenge,
        challengeExpiresAt: input.challengeExpiresAt,
      },
      capabilities: [...input.capabilities],
      candidates: input.candidates,
    },
  };
}

export function deviceDiscoveryAuthorized(
  headers: { authorization?: string; "x-asol-port-password"?: string },
  password: string,
): boolean {
  if (headers["x-asol-port-password"] === password) return true;
  const authorization = headers.authorization ?? "";
  if (!authorization.startsWith("Basic ")) return false;
  try {
    return Buffer.from(authorization.slice("Basic ".length), "base64").toString("utf8") === `asol:${password}`;
  } catch {
    return false;
  }
}
EOF

cat > scripts/local-agent-device-discovery.ts <<'EOF'
import { createServer } from "node:http";

import {
  createDeviceDiscoveryDocument,
  deviceDiscoveryAuthorized,
  resolveDeviceDiscoveryConfig,
} from "@asol/local-agent-core";
import {
  collectDirectCandidates,
  DEFAULT_ALLOWED_CAPABILITIES,
  hostIdentifier,
  loadOrCreateHostIdentityKey,
  loadOrRotateDiscoveryChallenge,
  resolveDirectAgentPort,
} from "../packages/local-agent-core/src/direct/index";
import {
  createOtaR2Client,
  getOtaPublicBaseUrl,
  loadOtaEnvironment,
  putOtaObject,
} from "@asol/ota-core/publishing";

async function readPublicIp(): Promise<string | null> {
  for (const url of ["https://api.ipify.org", "https://ifconfig.me/ip", "https://icanhazip.com"]) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.ok) {
        const value = (await response.text()).trim();
        if (/^[a-f0-9:.]+$/i.test(value)) return value;
      }
    } catch {
      // Try next endpoint.
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

async function publish(document: unknown, key: string): Promise<string> {
  loadOtaEnvironment();
  await putOtaObject(createOtaR2Client(), key, `${JSON.stringify(document, null, 2)}\n`, "application/json", "no-store");
  return `${getOtaPublicBaseUrl().replace(/\/$/, "")}/${key}`;
}

function serve(document: unknown, password: string, port: number): Promise<void> {
  const server = createServer((request, response) => {
    const authorized = deviceDiscoveryAuthorized(
      {
        authorization: request.headers.authorization,
        "x-asol-port-password": request.headers["x-asol-port-password"] as string | undefined,
      },
      password,
    );
    if (!authorized) {
      response.writeHead(401, {
        "content-type": "application/json; charset=utf-8",
        "www-authenticate": 'Basic realm="asol-device-discovery"',
      });
      response.end(`${JSON.stringify({ ok: false, error: "unauthorized" })}\n`);
      return;
    }
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(`${JSON.stringify({ ok: true, document }, null, 2)}\n`);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      console.log(JSON.stringify({ listening: server.address(), role: "discovery-only", execution: false }, null, 2));
      resolve();
    });
  });
}

async function main(): Promise<void> {
  const config = resolveDeviceDiscoveryConfig();
  const publicIp = await readPublicIp();
  const directPort = resolveDirectAgentPort();
  const identity = loadOrCreateHostIdentityKey();
  const challenge = loadOrRotateDiscoveryChallenge();
  const candidates = await collectDirectCandidates({ port: directPort, publicIp, stunServers: [] });
  const document = createDeviceDiscoveryDocument({
    port: config.port,
    publicIp,
    hostId: hostIdentifier(),
    directPort,
    serverKeyId: identity.serverKeyId,
    serverPublicKey: identity.publicKeyPem,
    challenge: challenge.challenge,
    challengeExpiresAt: challenge.expiresAt,
    capabilities: [...DEFAULT_ALLOWED_CAPABILITIES],
    candidates,
  });

  if (hasFlag("dry-run")) {
    console.log(JSON.stringify({ dryRun: true, r2Key: config.r2Key, document }, null, 2));
    return;
  }

  const url = await publish(document, config.r2Key);
  console.log(JSON.stringify({ published: true, schemaVersion: 2, r2Key: config.r2Key, publicUrl: url }, null, 2));
  if (hasFlag("publish-only")) return;
  await serve(document, config.password, config.port);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
EOF

python3 - <<'PY'
from pathlib import Path
p=Path('packages/local-agent-core/src/tests/index.test.ts')
s=p.read_text()
old='createDeviceDiscoveryDocument({ port: 48731, publicIp: "203.0.113.10", generatedAt: new Date("2026-01-01T00:00:00.000Z") })'
if old in s:
    new='createDeviceDiscoveryDocument({ port: 48731, publicIp: "203.0.113.10", hostId: "test-host", directPort: 48732, serverKeyId: "key-1", serverPublicKey: "-----BEGIN PUBLIC KEY-----\\ntest\\n-----END PUBLIC KEY-----", challenge: "ch_testchallenge0000000000000000000000000000000000000000", challengeExpiresAt: "2026-01-01T00:10:00.000Z", capabilities: ["inspect"], candidates: [], generatedAt: new Date("2026-01-01T00:00:00.000Z") })'
    s=s.replace(old,new)
p.write_text(s)
PY

python3 - <<'PY'
from pathlib import Path
p=Path('packages/local-agent-core/src/tests/direct.test.ts')
s=p.read_text()
needle='  console.log("@asol/local-agent-core direct domain: all checks passed.");'
insert='''  const discoveryModule = await import("../host-discovery");
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

'''+needle
if needle not in s:
    raise SystemExit('direct test anchor missing')
s=s.replace(needle,insert)
p.write_text(s)
PY

npm run test:local-agent-core
npm run typecheck
npm run docs:generate
npm run architecture:check
npm run docs:ci
