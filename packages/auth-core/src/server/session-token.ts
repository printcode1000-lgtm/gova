import { signEnvelope, verifyEnvelope } from '@asol/signed-token-core';

import type { SignedSessionClaims } from '../domain/entities';
import { getSessionSigningSecret } from '../ports/session-signing-secret.port';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The envelope, the constant-time comparison and the rejection order live in
 * `@asol/signed-token-core`. What stays here is the only part that is about a *session*: how long
 * one lasts, and which claims make it usable.
 */
const ENVELOPE = {
  secret: getSessionSigningSecret,
  invalidError: 'sessionTokenInvalid',
  expiredError: 'sessionTokenExpired',
};

export function createSignedSessionToken(uid: string, phone: string): string {
  return signEnvelope<SignedSessionClaims>({ uid, phone }, { ...ENVELOPE, ttlMs: SESSION_TTL_MS });
}

export function verifySignedSessionToken(token: string): SignedSessionClaims {
  return verifyEnvelope<SignedSessionClaims>(token, {
    ...ENVELOPE,
    validate: (claims) => Boolean(claims.uid) && Boolean(claims.phone),
  });
}
