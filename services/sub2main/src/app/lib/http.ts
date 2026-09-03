import { businessApiErrorStatus } from '@/core/api/business-api-error-status';
import { createCorsPolicy, reflectRequestOrigin } from '@asol/cors';
import { createServiceHttp, type ErrorStatusRule } from '@asol/service-runtime-core';

/**
 * The sub2main deployment's HTTP policy: seller-facing profile and product writes, so it answers
 * more methods than the read-only mirrors. The mechanism is `@asol/service-runtime-core`.
 */
const SELLER_ERROR_RULES: readonly ErrorStatusRule[] = [
  { status: 404, equals: ['productNotFound'], includes: ['NotFound'] },
  { status: 403, equals: ['productForbidden'], includes: ['Forbidden'] },
  { status: 400, equals: ['invalidProduct'], includes: ['required'] },
];

const http = createServiceHttp({
  cors: createCorsPolicy({
    origins: reflectRequestOrigin(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Accept', 'X-Asol-Trace-Id'],
  }),
  defaultRules: SELLER_ERROR_RULES,
});

export const corsHeaders = http.corsHeaders;
export const preflight = http.preflight;
export const withCors = http.withCors;
export const sellerErrorResponse = http.errorResponse;

/**
 * The shared application status mapping, for the route families that moved here
 * whole. Reviews answer many more error codes than a hand-written rule list can
 * track, and a client cannot be moved to an origin that answers the same failure
 * with a different status.
 */
export function businessErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'internalServerError';
  const mapped = businessApiErrorStatus(message);
  // An unmapped failure is a server fault, and the client is told nothing about
  // it on purpose. It is logged here because a swallowed 500 is invisible: the
  // same silence hid an unregistered port on the control runtime until a
  // release callback happened to hit it, and it is what the account smoke gate
  // scans for. See docs/08-troubleshooting/problems/owned-route-not-shipped.md.
  if (mapped.status >= 500) {
    console.error(
      `[${new URL(request.url).pathname}] unmapped failure:`,
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
  }
  return Response.json(
    { error: mapped.code },
    { status: mapped.status, headers: corsHeaders(request) },
  );
}

/**
 * The review families' own status mapping, ported exactly.
 *
 * `/api/products/reviews` and `/api/profile/reviews` do not use the shared
 * mapping in the application: they read the *shape* of the code —
 * `…NotFound` is a `404`, `…Forbidden` is a `403` — plus a short list of `400`s.
 * The generic mapping answers `500` for `profileNotFound`, which turns "no such
 * profile" into a server fault. A client cannot be moved to an origin that
 * answers the same failure differently, so the rule moves with the route.
 */
export function reviewErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const status =
    message.includes('NotFound') || message === 'reviewNotFound'
      ? 404
      : message.includes('Forbidden') || message === 'sellerCannotReview'
        ? 403
        : ['invalidReview', 'reviewAlreadyExists', 'reviewsDisabled', 'userNotFound'].includes(
              message,
            )
          ? 400
          : 500;
  if (status >= 500) {
    console.error(
      `[${new URL(request.url).pathname}] unmapped failure:`,
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
  }
  return Response.json({ error: message }, { status, headers: corsHeaders(request) });
}

/** Helpful votes and seller replies answer every failure as a 400, as the application does. */
export function reviewActionErrorResponse(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  return Response.json({ error: message }, { status: 400, headers: corsHeaders(request) });
}
