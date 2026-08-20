import "server-only";

import { signEnvelope, verifyEnvelope } from "@asol/signed-token-core";

import { getAsolSessionSigningSecret } from "@/core/config/server-env";

export interface SpecialtyChatCapability {
  requestId: string;
  buyerUid: string;
  sellerUid: string;
  expiresAt: number;
}

const CAPABILITY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The signing envelope is `@asol/signed-token-core`. What belongs here is what a specialty-chat
 * capability *authorises*: this buyer talking to this seller about this request, for a week.
 */
const ENVELOPE = {
  secret: getAsolSessionSigningSecret,
  invalidError: "specialtyChatCapabilityInvalid",
  expiredError: "specialtyChatCapabilityExpired",
};

export function createSpecialtyChatCapability(
  value: Omit<SpecialtyChatCapability, "expiresAt"> & { expiresAt?: number },
): string {
  return signEnvelope<SpecialtyChatCapability>(value, {
    ...ENVELOPE,
    ttlMs: CAPABILITY_TTL_MS,
  });
}

export function verifySpecialtyChatCapability(token: string): SpecialtyChatCapability {
  return verifyEnvelope<SpecialtyChatCapability>(token, {
    ...ENVELOPE,
    validate: (value) =>
      Boolean(value.requestId) && Boolean(value.buyerUid) && Boolean(value.sellerUid),
  });
}
