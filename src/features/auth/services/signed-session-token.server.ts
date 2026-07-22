import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getAsolSessionSigningSecret } from "@/core/config/server-env";

interface SignedSessionClaims {
  uid: string;
  phone: string;
  expiresAt: number;
}

function signature(payload: string): string {
  return createHmac("sha256", getAsolSessionSigningSecret()).update(payload).digest("base64url");
}

export function createSignedSessionToken(uid: string, phone: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid, phone, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifySignedSessionToken(token: string): SignedSessionClaims {
  const [payload, candidate] = token.split(".");
  if (!payload || !candidate) throw new Error("sessionTokenInvalid");
  const expected = signature(payload);
  if (
    candidate.length !== expected.length ||
    !timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))
  ) {
    throw new Error("sessionTokenInvalid");
  }
  let claims: SignedSessionClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SignedSessionClaims;
  } catch {
    throw new Error("sessionTokenInvalid");
  }
  if (!claims.uid || !claims.phone || !Number.isFinite(claims.expiresAt)) {
    throw new Error("sessionTokenInvalid");
  }
  if (claims.expiresAt <= Date.now()) throw new Error("sessionTokenExpired");
  return claims;
}
