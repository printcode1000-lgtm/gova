import "server-only";

import "./auth-core-ports.server";
import {
  extractSessionToken,
  verifySignedSessionToken,
  type SignedSessionClaims,
} from "@asol/auth-core/server";

/**
 * The signed-in caller behind a request.
 *
 * The uid and phone come from the verified session, never from the body: a
 * route that reads them from the payload authorises whoever typed them. The
 * super-admin counterpart adds one check on top of this and lives beside the
 * super-admin feature, because only that feature knows what an admin is.
 */
export function assertSignedInRequest(request: Request): SignedSessionClaims {
  return verifySignedSessionToken(extractSessionToken(request));
}
