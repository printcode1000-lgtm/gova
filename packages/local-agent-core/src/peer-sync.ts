import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir, hostname, networkInterfaces } from "node:os";
import path from "node:path";

export const R2_PEERS_OBJECT_KEY = "device-link/peers.json";
export const DEFAULT_PEER_UDP_PORT = 41234;

export interface PeerRecord {
  hostname: string;
  lan_ip: string;
  wan_ip: string;
  udp_port: number;
  stun_ip: string;
  stun_port: number;
  role: "desktop" | "laptop";
  updated_at: string;
}

export interface PeerRegistry {
  desktop: PeerRecord | null;
  laptop: PeerRecord | null;
}

export interface R2PeerSettings {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

export const EMPTY_PEER_REGISTRY: PeerRegistry = {
  desktop: null,
  laptop: null,
};

export function resolveLocalRole(host?: string): "desktop" | "laptop" {
  const name = (host || hostname()).toLowerCase();
  if (name.includes("elitedesk") || name.includes("desk")) return "desktop";
  if (name.includes("elitebook") || name.includes("laptop")) return "laptop";
  return "desktop";
}

export function resolveLanIp(): string {
  const nets = networkInterfaces();
  const candidates: Array<{ name: string; address: string; score: number }> = [];

  for (const [name, netList] of Object.entries(nets)) {
    if (!netList) continue;
    for (const net of netList) {
      const isIpv4 = net.family === "IPv4" || (net.family as unknown) === 4;
      if (isIpv4 && !net.internal) {
        let score = 0;
        const lowerName = name.toLowerCase();
        if (lowerName.startsWith("en") || lowerName.startsWith("eth")) score = 10;
        else if (lowerName.startsWith("wl")) score = 8;
        else if (lowerName.startsWith("docker") || lowerName.startsWith("virbr") || lowerName.startsWith("veth") || lowerName.startsWith("br-")) score = -5;
        candidates.push({ name, address: net.address, score });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.address ?? "127.0.0.1";
}

export async function resolveWanIp(timeoutMs = 4000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
      headers: { "User-Agent": "asol-local-agent-peer-sync/1.0" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ip?: string };
    return typeof json?.ip === "string" && json.ip ? json.ip : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function readEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  try {
    const content = readFileSync(filePath, "utf8");
    const result: Record<string, string> = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const at = trimmed.indexOf("=");
      const key = trimmed.slice(0, at).trim();
      const val = trimmed.slice(at + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key) result[key] = val;
    }
    return result;
  } catch {
    return {};
  }
}

export function loadPeerR2Settings(): R2PeerSettings | null {
  const envPaths = [
    path.join(homedir(), ".config", "p2p-link", "r2.env"),
    path.join(homedir(), "p2p-link", "r2.env"),
    path.join(process.cwd(), ".env"),
  ];

  const candidateValues: Record<string, string> = {};
  for (const envPath of envPaths) {
    const parsed = readEnvFile(envPath);
    for (const [k, v] of Object.entries(parsed)) {
      if (!candidateValues[k] && v) candidateValues[k] = v;
    }
  }

  const endpoint = (process.env.ASOL_OTA_R2_ENDPOINT || candidateValues.ASOL_OTA_R2_ENDPOINT || "").trim().replace(/\/+$/, "");
  const bucket = (process.env.ASOL_OTA_R2_BUCKET_NAME || candidateValues.ASOL_OTA_R2_BUCKET_NAME || "").trim();
  const accessKeyId = (process.env.ASOL_OTA_R2_ACCESS_KEY_ID || candidateValues.ASOL_OTA_R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (process.env.ASOL_OTA_R2_SECRET_ACCESS_KEY || candidateValues.ASOL_OTA_R2_SECRET_ACCESS_KEY || "").trim();
  const region = (process.env.ASOL_OTA_R2_LOCATION || candidateValues.ASOL_OTA_R2_LOCATION || "auto").trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region: region || "auto",
  };
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getSigningKey(secretKey: string, datestamp: string, region: string): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, datestamp);
  const kRegion = crypto.createHmac("sha256", kDate).update(region, "utf8").digest();
  const kService = crypto.createHmac("sha256", kRegion).update("s3", "utf8").digest();
  return crypto.createHmac("sha256", kService).update("aws4_request", "utf8").digest();
}

async function requestR2(
  settings: R2PeerSettings,
  method: "GET" | "PUT",
  objectKey: string,
  body = "",
  contentType = "application/json",
): Promise<{ status: number; text: string }> {
  const parsedUrl = new URL(settings.endpoint);
  const host = parsedUrl.host;
  const region = settings.region || "auto";
  const pathName = `/${settings.bucket}/${objectKey}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const datestamp = amzDate.slice(0, 8); // YYYYMMDD

  const payloadHash = sha256Hex(body);
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [method, pathName, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${datestamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");

  const signingKey = getSigningKey(settings.secretAccessKey, datestamp, region);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${settings.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers: Record<string, string> = {
    Host: host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    Authorization: authorization,
  };

  if (method === "PUT") {
    headers["Content-Type"] = contentType;
    headers["Content-Length"] = String(Buffer.byteLength(body, "utf8"));
    headers["Cache-Control"] = "no-store";
  }

  const url = `${settings.endpoint.replace(/\/+$/, "")}${pathName}`;
  const response = await fetch(url, {
    method,
    headers,
    body: method === "PUT" ? body : undefined,
  });

  const text = await response.text();
  return { status: response.status, text };
}

export async function fetchPeerRegistry(settings: R2PeerSettings): Promise<PeerRegistry> {
  try {
    const res = await requestR2(settings, "GET", R2_PEERS_OBJECT_KEY);
    if (res.status === 404 || !res.text) {
      return { ...EMPTY_PEER_REGISTRY };
    }
    if (res.status >= 200 && res.status < 300) {
      const parsed = JSON.parse(res.text) as Partial<PeerRegistry>;
      return {
        desktop: parsed.desktop || null,
        laptop: parsed.laptop || null,
      };
    }
    throw new Error(`R2 GET ${R2_PEERS_OBJECT_KEY} failed with status ${res.status}: ${res.text}`);
  } catch (error) {
    if (error instanceof SyntaxError) return { ...EMPTY_PEER_REGISTRY };
    throw error;
  }
}

export function upsertPeerRecord(
  registry: PeerRegistry,
  role: "desktop" | "laptop",
  record: Omit<PeerRecord, "role" | "updated_at">,
): PeerRegistry {
  const updated: PeerRecord = {
    ...record,
    role,
    updated_at: new Date().toISOString(),
  };

  return {
    ...registry,
    [role]: updated,
  };
}

export async function publishPeerRegistry(settings: R2PeerSettings, registry: PeerRegistry): Promise<void> {
  const body = JSON.stringify(registry, null, 2);
  const res = await requestR2(settings, "PUT", R2_PEERS_OBJECT_KEY, body, "application/json");
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`R2 PUT ${R2_PEERS_OBJECT_KEY} failed with status ${res.status}: ${res.text}`);
  }
}

export interface PeerSyncResult {
  role: "desktop" | "laptop";
  hostname: string;
  lanIp: string;
  wanIp: string;
  previous: PeerRecord | null;
  current: PeerRecord;
  changed: boolean;
  registry: PeerRegistry;
}

export async function syncPeerInfoToR2(
  customSettings?: R2PeerSettings,
  options: { role?: "desktop" | "laptop"; udpPort?: number } = {},
): Promise<PeerSyncResult> {
  const settings = customSettings || loadPeerR2Settings();
  if (!settings) {
    throw new Error("Missing Cloudflare R2 credentials (ASOL_OTA_R2_*). Check .env or ~/.config/p2p-link/r2.env");
  }

  const role = options.role || resolveLocalRole();
  const host = hostname();
  const lanIp = resolveLanIp();
  const wanIp = (await resolveWanIp()) || "";
  const udpPort = options.udpPort || DEFAULT_PEER_UDP_PORT;

  const currentRegistry = await fetchPeerRegistry(settings);
  const previousRecord = currentRegistry[role];

  const changed =
    !previousRecord ||
    previousRecord.hostname !== host ||
    previousRecord.lan_ip !== lanIp ||
    previousRecord.wan_ip !== wanIp ||
    previousRecord.udp_port !== udpPort;

  const updatedRegistry = upsertPeerRecord(currentRegistry, role, {
    hostname: host,
    lan_ip: lanIp,
    wan_ip: wanIp,
    udp_port: udpPort,
    stun_ip: "",
    stun_port: udpPort,
  });

  await publishPeerRegistry(settings, updatedRegistry);

  return {
    role,
    hostname: host,
    lanIp,
    wanIp,
    previous: previousRecord,
    current: updatedRegistry[role]!,
    changed,
    registry: updatedRegistry,
  };
}
