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
