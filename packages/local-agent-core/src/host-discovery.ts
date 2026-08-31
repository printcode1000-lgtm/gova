import { arch, cpus, freemem, hostname, networkInterfaces, platform, release, totalmem, uptime, userInfo } from "node:os";
import { cwd } from "node:process";

export const DEVICE_DISCOVERY_PORT_ENV = "ASOL_DEVICE_DISCOVERY_PORT";
export const DEVICE_DISCOVERY_PASSWORD_ENV = "ASOL_DEVICE_DISCOVERY_PORT_PASSWORD";
export const DEVICE_DISCOVERY_R2_KEY_ENV = "ASOL_DEVICE_DISCOVERY_R2_KEY";
export const DEFAULT_DEVICE_DISCOVERY_PORT = 48731;
export const DEFAULT_DEVICE_DISCOVERY_R2_KEY_PREFIX = "host-discovery";

export interface DeviceDiscoveryAddress {
  name: string;
  address: string;
  family: string;
  cidr: string | null;
  mac: string;
}

export interface DeviceDiscoveryConfig {
  port: number;
  password: string;
  r2Key: string;
}

export interface DeviceDiscoveryDocument {
  schemaVersion: 1;
  generatedAt: string;
  expiresAt: string;
  host: {
    hostname: string;
    platform: NodeJS.Platform;
    arch: string;
    release: string;
    username: string;
    cwd: string;
    node: string;
    pid: number;
    cpuCount: number;
    totalMemoryMb: number;
    freeMemoryMb: number;
    uptimeSeconds: number;
  };
  network: {
    publicIp: string | null;
    addresses: DeviceDiscoveryAddress[];
    urlCandidates: string[];
  };
  port: {
    number: number;
    protocol: "http";
    bindHost: "0.0.0.0";
    passwordEnv: typeof DEVICE_DISCOVERY_PASSWORD_ENV;
    auth: "x-asol-port-password";
  };
}

function safeIdentifier(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown-host";
}

export function defaultDeviceDiscoveryR2Key(host = hostname()): string {
  return `${DEFAULT_DEVICE_DISCOVERY_R2_KEY_PREFIX}/${safeIdentifier(host)}.json`;
}

export function resolveDeviceDiscoveryConfig(env: NodeJS.ProcessEnv = process.env): DeviceDiscoveryConfig {
  const rawPort = env[DEVICE_DISCOVERY_PORT_ENV] ?? String(DEFAULT_DEVICE_DISCOVERY_PORT);
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${DEVICE_DISCOVERY_PORT_ENV} must be a TCP port number between 1 and 65535`);
  }

  const password = env[DEVICE_DISCOVERY_PASSWORD_ENV];
  if (!password) throw new Error(`${DEVICE_DISCOVERY_PASSWORD_ENV} is required`);

  return {
    port,
    password,
    r2Key: env[DEVICE_DISCOVERY_R2_KEY_ENV] || defaultDeviceDiscoveryR2Key(),
  };
}

export function collectDeviceDiscoveryAddresses(): DeviceDiscoveryAddress[] {
  const addresses: DeviceDiscoveryAddress[] = [];
  for (const [name, infos] of Object.entries(networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.internal) continue;
      addresses.push({
        name,
        address: info.address,
        family: info.family,
        cidr: info.cidr ?? null,
        mac: info.mac,
      });
    }
  }
  return addresses.sort((left, right) => `${left.name}:${left.address}`.localeCompare(`${right.name}:${right.address}`));
}

export function createDeviceDiscoveryDocument(input: {
  port: number;
  publicIp: string | null;
  generatedAt?: Date;
  addresses?: DeviceDiscoveryAddress[];
}): DeviceDiscoveryDocument {
  const generatedAt = input.generatedAt ?? new Date();
  const expiresAt = new Date(generatedAt.getTime() + 10 * 60 * 1000);
  const addresses = input.addresses ?? collectDeviceDiscoveryAddresses();
  const urls = new Set<string>();
  if (input.publicIp) urls.add(`http://${input.publicIp}:${input.port}`);
  for (const item of addresses) {
    if (item.family === "IPv4") urls.add(`http://${item.address}:${input.port}`);
  }

  return {
    schemaVersion: 1,
    generatedAt: generatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    host: {
      hostname: hostname(),
      platform: platform(),
      arch: arch(),
      release: release(),
      username: userInfo().username,
      cwd: cwd(),
      node: process.version,
      pid: process.pid,
      cpuCount: cpus().length,
      totalMemoryMb: Math.round(totalmem() / 1024 / 1024),
      freeMemoryMb: Math.round(freemem() / 1024 / 1024),
      uptimeSeconds: Math.round(uptime()),
    },
    network: {
      publicIp: input.publicIp,
      addresses,
      urlCandidates: [...urls],
    },
    port: {
      number: input.port,
      protocol: "http",
      bindHost: "0.0.0.0",
      passwordEnv: DEVICE_DISCOVERY_PASSWORD_ENV,
      auth: "x-asol-port-password",
    },
  };
}

export function deviceDiscoveryAuthorized(headers: { authorization?: string; "x-asol-port-password"?: string }, password: string): boolean {
  if (headers["x-asol-port-password"] === password) return true;
  const authorization = headers.authorization ?? "";
  if (!authorization.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(authorization.slice("Basic ".length), "base64").toString("utf8");
    return decoded === `asol:${password}`;
  } catch {
    return false;
  }
}
