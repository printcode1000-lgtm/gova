/** Minimal signed-session server seam for isolated administrative runtimes. */
export { registerSessionSigningSecret, getSessionSigningSecret } from './ports/session-signing-secret.port';
export { createSignedSessionToken, verifySignedSessionToken } from './server/session-token';
export { extractSessionToken, assertSessionMatchesUid } from './server/session-auth';
export type { SignedSessionClaims } from './domain/entities';
