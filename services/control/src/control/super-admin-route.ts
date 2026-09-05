import 'server-only';

import { readJsonContractBody } from '@asol/api-contract-core/server';

import { extractSessionToken, registerSessionSigningSecret, verifySignedSessionToken, type SignedSessionClaims } from '@asol/auth-core/session';
import { SUPER_ADMIN_PHONE, SUPER_ADMIN_UID } from '@asol/auth-core';
import { isSuperAdminIdentity, registerSuperAdminIdentity } from '@asol/auth-core/super-admin';
import { businessApiErrorStatus } from '@/core/api/business-api-error-status';
import { controlJson, withControlCors } from './operational-route';

registerSessionSigningSecret(() => process.env.ASOL_SESSION_SIGNING_SECRET?.trim() ?? '');
registerSuperAdminIdentity(() => ({ uid: SUPER_ADMIN_UID, phone: SUPER_ADMIN_PHONE }));

type Awaitable<T> = T | Promise<T>;
type Context = { admin: SignedSessionClaims };
/** The JSON variant has already parsed the body, so it is present, not optional. */
type JsonContext<TBody> = Context & { body: TBody };

function authorized(request: Request): SignedSessionClaims {
  const claims = verifySignedSessionToken(extractSessionToken(request));
  if (!isSuperAdminIdentity(claims.uid, claims.phone)) throw new Error('forbidden');
  return claims;
}

/**
 * The same status and body the application answered for the same failure.
 *
 * The mapping is shared rather than restated: this function used to answer
 * `401` where the application answered `403` for `forbidden`, and `400` where
 * the application answered `500 internalServerError` for an unrecognised error.
 * A client moved to a new origin that answers the same failures differently is
 * a broken client.
 */
function failure(error: unknown, request?: Request): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const mapped = businessApiErrorStatus(message);
  return controlJson({ error: mapped.code }, mapped.status, request);
}

export async function runControlSuperAdminRoute<T>(request: Request, handler: (context: Context) => Awaitable<T | Response>): Promise<Response> {
  try {
    const result = await handler({ admin: authorized(request) });
    return result instanceof Response
      ? withControlCors(request, result)
      : controlJson(result, 200, request);
  } catch (error) { return failure(error, request); }
}

export async function runControlSuperAdminJsonRoute<TBody, TResult>(request: Request, handler: (context: JsonContext<TBody>) => Awaitable<TResult | Response>): Promise<Response> {
  try {
    const admin = authorized(request);
    const body = await readJsonContractBody<TBody>(request);
    const result = await handler({ admin, body });
    return result instanceof Response
      ? withControlCors(request, result)
      : controlJson(result, 200, request);
  } catch (error) { return failure(error, request); }
}
