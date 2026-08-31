import type { DirectWebRtcAnswer, DirectWebRtcOffer } from "./webrtc-tunnel";

export const DIRECT_RENDEZVOUS_PREFIX = "direct-rendezvous";
export const DIRECT_RENDEZVOUS_TTL_MS = 60_000;
export const DIRECT_RENDEZVOUS_POLL_MS = 1_000;

function safe(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

export interface DirectRendezvousOfferDocument {
  schemaVersion: 1;
  requestId: string;
  sessionId: string;
  bootstrapRequestId: string;
  hostId: string;
  createdAt: string;
  expiresAt: string;
  offer: DirectWebRtcOffer;
}

export interface DirectRendezvousAnswerDocument {
  schemaVersion: 1;
  requestId: string;
  sessionId: string;
  hostId: string;
  createdAt: string;
  expiresAt: string;
  answer: DirectWebRtcAnswer;
}

export function directRendezvousHostPrefix(hostId: string): string {
  return `${DIRECT_RENDEZVOUS_PREFIX}/${safe(hostId)}`;
}

export function directRendezvousOfferKey(hostId: string, requestId: string): string {
  return `${directRendezvousHostPrefix(hostId)}/offers/${safe(requestId)}.json`;
}

export function directRendezvousAnswerKey(hostId: string, requestId: string): string {
  return `${directRendezvousHostPrefix(hostId)}/answers/${safe(requestId)}.json`;
}

export function rendezvousDocumentIsFresh(document: { createdAt?: string; expiresAt?: string }, now = Date.now()): boolean {
  const created = Date.parse(document.createdAt ?? "");
  const expires = Date.parse(document.expiresAt ?? "");
  return Number.isFinite(created) && Number.isFinite(expires) && created <= now + 10_000 && expires > now && expires - created <= DIRECT_RENDEZVOUS_TTL_MS + 5_000;
}
