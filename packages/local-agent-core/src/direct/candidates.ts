import { createSocket } from "node:dgram";
import { networkInterfaces } from "node:os";

export type CandidateType = "loopback" | "lan" | "ipv6" | "stun" | "public";

export interface DirectCandidate {
  type: CandidateType;
  address: string;
  port: number;
  protocol: "tcp" | "udp";
  priority: number;
  expiresAt: string;
}

export const DEFAULT_STUN_SERVERS = [
  "stun.l.google.com:19302",
  "stun1.l.google.com:19302",
  "stun.cloudflare.com:3478",
];

export interface CandidateDiscoveryOptions {
  port: number;
  stunServers?: string[];
  publicIp?: string | null;
  ttlMs?: number;
}

/**
 * Query a STUN server (RFC 5389 / RFC 8489) for external mapped endpoint over UDP.
 */
export function queryStunServer(
  serverHost: string,
  serverPort = 19302,
  timeoutMs = 2000,
): Promise<{ ip: string; port: number } | null> {
  return new Promise((resolve) => {
    let socket: ReturnType<typeof createSocket> | null = null;
    let timer: NodeJS.Timeout | null = null;
    let finished = false;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      if (socket) {
        try {
          socket.close();
        } catch {
          // ignore
        }
      }
    };

    try {
      socket = createSocket("udp4");
    } catch {
      resolve(null);
      return;
    }

    timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    socket.on("error", () => {
      cleanup();
      resolve(null);
    });

    const header = Buffer.alloc(20);
    header.writeUInt16BE(0x0001, 0); // Binding Request
    header.writeUInt16BE(0x0000, 2); // Length
    header.writeUInt32BE(0x2112a442, 4); // Magic Cookie
    for (let i = 8; i < 20; i++) header[i] = Math.floor(Math.random() * 256);

    socket.on("message", (msg) => {
      if (msg.length < 20) {
        cleanup();
        resolve(null);
        return;
      }
      const msgType = msg.readUInt16BE(0);
      if (msgType !== 0x0101) { // Binding Success Response
        cleanup();
        resolve(null);
        return;
      }

      let offset = 20;
      while (offset + 4 <= msg.length) {
        const attrType = msg.readUInt16BE(offset);
        const attrLen = msg.readUInt16BE(offset + 2);
        offset += 4;
        if (attrType === 0x0020 && attrLen >= 8) { // XOR-MAPPED-ADDRESS
          const family = msg.readUInt8(offset + 1);
          const mappedPort = msg.readUInt16BE(offset + 2) ^ 0x2112;
          if (family === 0x01) { // IPv4
            const ipBuf = Buffer.alloc(4);
            for (let i = 0; i < 4; i++) ipBuf[i] = msg[offset + 4 + i] ^ header[4 + i];
            const ip = ipBuf.join(".");
            cleanup();
            resolve({ ip, port: mappedPort });
            return;
          }
        }
        offset += attrLen + ((4 - (attrLen % 4)) % 4);
      }
      cleanup();
      resolve(null);
    });

    socket.send(header, serverPort, serverHost, (err) => {
      if (err) {
        cleanup();
        resolve(null);
      }
    });
  });
}

/**
 * Discover STUN mapped candidate by trying configured STUN servers in order.
 */
export async function discoverStunMappedEndpoint(
  servers: string[] = DEFAULT_STUN_SERVERS,
): Promise<{ ip: string; port: number } | null> {
  for (const entry of servers) {
    const [host, portStr] = entry.split(":");
    const port = portStr ? Number(portStr) : 19302;
    try {
      const res = await queryStunServer(host, port, 1500);
      if (res && res.ip && res.port) return res;
    } catch {
      // try next server
    }
  }
  return null;
}

/**
 * Read public IP via standard HTTPS endpoints.
 */
export async function readPublicIpHttp(): Promise<string | null> {
  const endpoints = ["https://api.ipify.org", "https://ifconfig.me/ip", "https://icanhazip.com"];
  for (const url of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.ok) {
        const text = (await response.text()).trim();
        if (/^[a-f0-9:.]+$/i.test(text)) return text;
      }
    } catch {
      // Try next endpoint
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

/**
 * Collect all available direct candidates on the local host.
 */
export async function collectDirectCandidates(
  options: CandidateDiscoveryOptions,
): Promise<DirectCandidate[]> {
  const { port, ttlMs = 10 * 60 * 1000 } = options;
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const candidates: DirectCandidate[] = [];

  // Loopback
  candidates.push({
    type: "loopback",
    address: "127.0.0.1",
    port,
    protocol: "tcp",
    priority: 10,
    expiresAt,
  });
  candidates.push({
    type: "loopback",
    address: "::1",
    port,
    protocol: "tcp",
    priority: 10,
    expiresAt,
  });

  // Local Network Interfaces (LAN & IPv6)
  for (const [, infos] of Object.entries(networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.internal) continue;
      if (info.family === "IPv4") {
        candidates.push({
          type: "lan",
          address: info.address,
          port,
          protocol: "tcp",
          priority: 100,
          expiresAt,
        });
      } else if (info.family === "IPv6" && info.scopeid === 0 && !info.address.startsWith("fe80:")) {
        candidates.push({
          type: "ipv6",
          address: info.address,
          port,
          protocol: "tcp",
          priority: 90,
          expiresAt,
        });
      }
    }
  }

  // STUN discovery
  const stunRes = await discoverStunMappedEndpoint(options.stunServers ?? DEFAULT_STUN_SERVERS);
  if (stunRes) {
    candidates.push({
      type: "stun",
      address: stunRes.ip,
      port, // TCP direct port on host
      protocol: "tcp",
      priority: 70,
      expiresAt,
    });
  }

  // Public IP fallback / complementary candidate
  const publicIp = options.publicIp ?? (await readPublicIpHttp());
  if (publicIp && (!stunRes || stunRes.ip !== publicIp)) {
    candidates.push({
      type: "public",
      address: publicIp,
      port,
      protocol: "tcp",
      priority: 60,
      expiresAt,
    });
  }

  return sortCandidates(candidates);
}

export function sortCandidates(candidates: DirectCandidate[]): DirectCandidate[] {
  // Deduplicate by type:address:port:protocol
  const seen = new Set<string>();
  const unique: DirectCandidate[] = [];
  for (const cand of candidates) {
    const key = `${cand.type}:${cand.address}:${cand.port}:${cand.protocol}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(cand);
    }
  }
  // Sort descending by priority
  return unique.sort((a, b) => b.priority - a.priority);
}
