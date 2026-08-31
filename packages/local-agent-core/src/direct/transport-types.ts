import { TlsCredentials } from "./crypto";
import { DirectResponseEnvelope } from "./protocol";
import { ReplayCache } from "./replay-cache";
import { SessionStore } from "./session";

export interface DirectServerOptions {
  port: number;
  bindHost?: string;
  sessionStore: SessionStore;
  replayCache: ReplayCache;
  tlsCredentials?: TlsCredentials;
}

export type DirectStreamSender = (event: DirectResponseEnvelope) => void;

export interface DirectClientConnectOptions {
  host: string;
  port: number;
  sessionId: string;
  bootstrapRequestId: string;
  clientKeyPair?: {
    publicKeyPem: string;
    privateKeyPem: string;
  };
  rejectUnauthorized?: boolean;
}

export type CandidateType = "loopback" | "lan" | "ipv6" | "stun" | "public";

export interface DirectCandidate {
  type: CandidateType;
  address: string;
  port: number;
  protocol: "tcp" | "udp";
  priority: number;
  expiresAt: string;
}

export interface CandidateDiscoveryOptions {
  port: number;
  stunServers?: string[];
  publicIp?: string | null;
  ttlMs?: number;
}
