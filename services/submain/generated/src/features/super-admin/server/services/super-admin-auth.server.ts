import 'server-only';

import {
  extractSessionToken,
  isSuperAdminIdentity,
  registerSessionSigningSecret,
  registerSuperAdminIdentity,
  verifySignedSessionToken,
  type SignedSessionClaims,
} from '@asol/auth-core/server';
import { getAsolSessionSigningSecret } from '@/core/config/server-env/server-env.values.turso-env';
import { SUPER_ADMIN_PHONE, SUPER_ADMIN_UID } from '@asol/auth-core';

registerSessionSigningSecret(getAsolSessionSigningSecret);
registerSuperAdminIdentity(() => ({ uid: SUPER_ADMIN_UID, phone: SUPER_ADMIN_PHONE }));

export function assertSuperAdminRequest(request: Request): SignedSessionClaims {
  const token = extractSessionToken(request);
  const claims = verifySignedSessionToken(token);
  if (!isSuperAdminIdentity(claims.uid, claims.phone)) {
    throw new Error('forbidden');
  }
  return claims;
}

/** Narrow identity seam for control-owned capabilities that do not parse requests. */
export function isConfiguredSuperAdminIdentity(uid: string, phone: string): boolean {
  return isSuperAdminIdentity(uid, phone);
}
