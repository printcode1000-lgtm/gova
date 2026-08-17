import 'server-only';

import '@/features/auth/server/auth-core-ports.server';
import {
  extractSessionToken,
  isSuperAdminIdentity,
  verifySignedSessionToken,
  type SignedSessionClaims,
} from '@asol/auth-core/server';

export function assertSuperAdminRequest(request: Request): SignedSessionClaims {
  const token = extractSessionToken(request);
  const claims = verifySignedSessionToken(token);
  if (!isSuperAdminIdentity(claims.uid, claims.phone)) {
    throw new Error('forbidden');
  }
  return claims;
}
