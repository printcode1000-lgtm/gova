import "server-only";

import { verifySignedSessionToken } from "@/features/auth/services/signed-session-token.server";
import { isSuperAdminIdentity } from "@/features/auth/utils/super-admin";

export function assertSuperAdminRequest(request: Request) {
  const token = request.headers.get("x-asol-session-token")?.trim() ?? "";
  const claims = verifySignedSessionToken(token);
  if (!isSuperAdminIdentity(claims.uid, claims.phone)) {
    throw new Error("forbidden");
  }
  return claims;
}
