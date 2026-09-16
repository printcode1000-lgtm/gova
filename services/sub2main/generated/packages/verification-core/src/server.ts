import { createHash, randomBytes, randomInt } from "node:crypto";
import {
  hmacDigest,
  signAsymmetricEnvelope,
  signEnvelope,
  verifyAsymmetricEnvelope,
  verifyEnvelope,
} from "@asol/signed-token-core";
import type {
  VerificationChannel,
  VerificationDispatchTicketClaims,
  VerificationProofClaims,
  VerificationPurpose,
  VerificationSmsAuthorizationClaims,
} from "./index";
import {
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_DISPATCH_TICKET_TTL_MS,
  VERIFICATION_PROOF_TTL_MS,
  VERIFICATION_SMS_AUTH_TTL_MS,
} from "./index";

export interface VerificationSecretOptions {
  secret: () => string;
}

const PROOF_ENVELOPE = {
  invalidError: "verificationProofInvalid",
  expiredError: "verificationProofExpired",
};

const DISPATCH_ENVELOPE = {
  invalidError: "verificationDispatchTicketInvalid",
  expiredError: "verificationDispatchTicketExpired",
};

const SMS_AUTH_AUDIENCE = "com.hesham.smssender.verification-sms" as const;

export function createVerificationCode(): string {
  const min = 10 ** (VERIFICATION_CODE_LENGTH - 1);
  const max = 10 ** VERIFICATION_CODE_LENGTH;
  return randomInt(min, max).toString();
}

export function createVerificationId(prefix: string): string {
  return `${prefix}_${randomBytes(18).toString("hex")}`;
}

export function verificationDigest(secret: string, value: string): string {
  return hmacDigest(secret, value);
}

export function signVerificationProof(
  claims: Omit<VerificationProofClaims, "expiresAt">,
  options: VerificationSecretOptions,
): string {
  return signEnvelope<VerificationProofClaims>(claims, {
    ...PROOF_ENVELOPE,
    secret: options.secret,
    ttlMs: VERIFICATION_PROOF_TTL_MS,
  });
}

export function verifyVerificationProof(
  proof: string,
  options: VerificationSecretOptions,
): VerificationProofClaims {
  return verifyEnvelope<VerificationProofClaims>(proof, {
    ...PROOF_ENVELOPE,
    secret: options.secret,
    validate: (claims) =>
      Boolean(claims.challengeId) &&
      Boolean(claims.purpose) &&
      Boolean(claims.phone) &&
      Boolean(claims.channel) &&
      Boolean(claims.nonce),
  });
}

export function signVerificationDispatchTicket(
  claims: Omit<VerificationDispatchTicketClaims, "expiresAt">,
  options: VerificationSecretOptions,
): string {
  return signEnvelope<VerificationDispatchTicketClaims>(claims, {
    ...DISPATCH_ENVELOPE,
    secret: options.secret,
    ttlMs: VERIFICATION_DISPATCH_TICKET_TTL_MS,
  });
}

export function verifyVerificationDispatchTicket(
  ticket: string,
  options: VerificationSecretOptions,
): VerificationDispatchTicketClaims {
  return verifyEnvelope<VerificationDispatchTicketClaims>(ticket, {
    ...DISPATCH_ENVELOPE,
    secret: options.secret,
    validate: (claims) =>
      Boolean(claims.challengeId) &&
      Boolean(claims.dispatchId) &&
      Boolean(claims.nonce),
  });
}

export function createSmsAuthorizationClaims(input: {
  requestId: string;
  number: string;
  message: string;
}): VerificationSmsAuthorizationClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    aud: SMS_AUTH_AUDIENCE,
    requestId: input.requestId,
    number: input.number,
    messageSha256: createHash("sha256").update(input.message).digest("base64url"),
    iat: now,
    exp: now + Math.floor(VERIFICATION_SMS_AUTH_TTL_MS / 1000),
    nonce: randomBytes(16).toString("base64url"),
  };
}

type SmsAuthorizationEnvelopeClaims = VerificationSmsAuthorizationClaims & { expiresAt: number };

const SMS_AUTH_ENVELOPE = {
  invalidError: "verificationSmsAuthorizationInvalid",
  expiredError: "verificationSmsAuthorizationExpired",
};

export interface VerificationSmsSigningKeys {
  /** PKCS#8 PEM. When absent, the authorization falls back to the shared-secret envelope. */
  privateKeyPem?: string | null;
  secret: () => string;
}

/**
 * Signs the per-message send authorization.
 *
 * Asymmetric when a key is configured, and that is the point: the verifier is
 * SMS Sender, a separate application on the gateway phone. It must be able to
 * prove that this exact number and this exact body were authorized by Gova
 * without holding anything that could mint such an authorization — so it embeds
 * the public key and nothing else.
 *
 * The shared-secret fallback exists because the installed SMS Sender build
 * verifies neither: it accepts `number` and `message` and ignores the rest. Until
 * an authenticated build ships, this field is forward compatibility rather than
 * an enforcement boundary, and an unconfigured key must not take the gateway
 * down. Once the key is configured, every authorization is verifiable by public
 * key alone, with no Gova change needed on the day SMS Sender starts checking it.
 */
export function signSmsAuthorization(
  claims: VerificationSmsAuthorizationClaims,
  options: VerificationSmsSigningKeys,
): string {
  const payload: SmsAuthorizationEnvelopeClaims = { ...claims, expiresAt: claims.exp * 1000 };
  const privateKeyPem = options.privateKeyPem?.trim();
  if (privateKeyPem) {
    return signAsymmetricEnvelope<SmsAuthorizationEnvelopeClaims>(payload, {
      ...SMS_AUTH_ENVELOPE,
      privateKeyPem: () => privateKeyPem,
    });
  }
  return signEnvelope<SmsAuthorizationEnvelopeClaims>(payload, {
    ...SMS_AUTH_ENVELOPE,
    secret: options.secret,
  });
}

/**
 * The verification SMS Sender performs, expressed here so both sides are one
 * definition rather than two beliefs.
 *
 * Binding the message digest is what makes the authorization useless for anything
 * but this exact send: a tampered body or a swapped destination fails before the
 * radio is touched.
 */
export function verifySmsAuthorization(
  authorization: string,
  expected: { requestId: string; number: string; message: string },
  options: { publicKeyPem: string },
): VerificationSmsAuthorizationClaims {
  const claims = verifyAsymmetricEnvelope<SmsAuthorizationEnvelopeClaims>(authorization, {
    ...SMS_AUTH_ENVELOPE,
    publicKeyPem: () => options.publicKeyPem,
    validate: (value) => value.aud === SMS_AUTH_AUDIENCE && Boolean(value.nonce),
  });
  if (claims.requestId !== expected.requestId) throw new Error(SMS_AUTH_ENVELOPE.invalidError);
  if (claims.number !== expected.number) throw new Error(SMS_AUTH_ENVELOPE.invalidError);
  const digest = createHash("sha256").update(expected.message).digest("base64url");
  if (claims.messageSha256 !== digest) throw new Error(SMS_AUTH_ENVELOPE.invalidError);
  return claims;
}

export function assertProofBinding(
  proof: VerificationProofClaims,
  expected: {
    purpose: VerificationPurpose;
    phone: string;
    uid?: string | null;
    email?: string | null;
    channel?: VerificationChannel;
  },
): void {
  if (proof.purpose !== expected.purpose) throw new Error("verificationProofPurposeMismatch");
  if (proof.phone !== expected.phone) throw new Error("verificationProofPhoneMismatch");
  if ((proof.uid ?? null) !== (expected.uid ?? null)) {
    throw new Error("verificationProofUidMismatch");
  }
  if ((proof.email ?? null) !== (expected.email ?? null)) {
    throw new Error("verificationProofEmailMismatch");
  }
  if (expected.channel && proof.channel !== expected.channel) {
    throw new Error("verificationProofChannelMismatch");
  }
}
