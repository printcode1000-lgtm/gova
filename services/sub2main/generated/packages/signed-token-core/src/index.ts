/**
 * @asol/signed-token-core — the signed envelope every capability in this project travels in.
 *
 * Server-only: it holds signing, not policy. What a token *means* — a session, a notification
 * grant, a chat capability — stays with the package that owns that meaning; this one owns only
 * how such a thing is signed, compared, and rejected.
 */
export type {
  ExpiringPayload,
  SignOptions,
  SignedEnvelopeOptions,
} from './domain/signed-envelope';
export {
  hmacDigest,
  signEnvelope,
  signaturesMatch,
  verifyEnvelope,
} from './domain/signed-envelope';
