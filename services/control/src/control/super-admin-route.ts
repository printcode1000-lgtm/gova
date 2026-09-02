import 'server-only';

import { extractSessionToken, registerSessionSigningSecret, verifySignedSessionToken, type SignedSessionClaims } from '@asol/auth-core/session';
import { SUPER_ADMIN_PHONE, SUPER_ADMIN_UID } from '@asol/auth-core';
import { isSuperAdminIdentity, registerSuperAdminIdentity } from '@asol/auth-core/super-admin';
import { businessApiErrorStatus } from '@/core/api/business-api-error-status';
import { controlCorsHeaders } from './operational-route';

registerSessionSigningSecret(() => process.env.ASOL_SESSION_SIGNING_SECRET?.trim() ?? '');
registerSuperAdminIdentity(() => ({ uid: SUPER_ADMIN_UID, phone: SUPER_ADMIN_PHONE }));

/**
 * Every control response carries CORS, including the ones a handler builds itself.
 *
 * The Super Admin console is a browser client on another origin. A response
 * without `Access-Control-Allow-Origin` is discarded by the browser, and the
 * console reports an unreachable server for a runtime that answered correctly.
 * Adding the headers at the two runners covers every route at once, so a new
 * control route cannot forget them.
 */
function withControlCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(controlCorsHeaders(request))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
  return Response.json(
    { error: mapped.code },
    { status: mapped.status, headers: request ? controlCorsHeaders(request) : undefined },
  );
}

export async function runControlSuperAdminRoute<T>(request: Request, handler: (context: Context) => Awaitable<T | Response>): Promise<Response> {
  try {
    const result = await handler({ admin: authorized(request) });
    return result instanceof Response
      ? withControlCors(request, result)
      : Response.json(result, { headers: controlCorsHeaders(request) });
  } catch (error) { return failure(error, request); }
}

export async function runControlSuperAdminJsonRoute<TBody, TResult>(request: Request, handler: (context: JsonContext<TBody>) => Awaitable<TResult | Response>): Promise<Response> {
  try {
    const admin = authorized(request);
    const body = await request.json() as TBody;
    const result = await handler({ admin, body });
    return result instanceof Response
      ? withControlCors(request, result)
      : Response.json(result, { headers: controlCorsHeaders(request) });
  } catch (error) { return failure(error, request); }
}
