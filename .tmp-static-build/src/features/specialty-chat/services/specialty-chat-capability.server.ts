import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getAsolSessionSigningSecret } from "@/core/config/server-env";

export interface SpecialtyChatCapability {
  requestId: string;
  buyerUid: string;
  sellerUid: string;
  expiresAt: number;
}

function signature(value: string): string {
  return createHmac("sha256", getAsolSessionSigningSecret())
    .update(value)
    .digest("base64url");
}

export function createSpecialtyChatCapability(
  value: Omit<SpecialtyChatCapability, "expiresAt"> & { expiresAt?: number },
): string {
  const payload = Buffer.from(
    JSON.stringify({
      ...value,
      expiresAt: value.expiresAt ?? Date.now() + 7 * 24 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifySpecialtyChatCapability(token: string): SpecialtyChatCapability {
  const [payload, candidate] = token.split(".");
  if (!payload || !candidate) throw new Error("specialtyChatCapabilityInvalid");
  const expected = signature(payload);
  if (
    candidate.length !== expected.length ||
    !timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))
  ) {
    throw new Error("specialtyChatCapabilityInvalid");
  }
  const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SpecialtyChatCapability;
  if (!value.requestId || !value.buyerUid || !value.sellerUid || value.expiresAt <= Date.now()) {
    throw new Error("specialtyChatCapabilityExpired");
  }
  return value;
}
