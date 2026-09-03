import { resolveCorsHeaders } from './headers';
import type { CorsPolicy, CorsRequestLike } from './types';

/** `204 No Content` — a preflight answers with headers and never a body. */
export const PREFLIGHT_STATUS = 204;

/**
 * Whether this request is a CORS preflight.
 *
 * The method alone is the test. A stricter check on `Access-Control-Request-Method` would let a
 * malformed preflight fall through to Next's own handling, whose bare `204` carries no origin
 * header — and a preflight without one is refused by the browser, which reports a network outage
 * for a server that is up and would have answered. Two production outages came from that gap.
 */
export function isCorsPreflight(request: { readonly method: string }): boolean {
  return request.method === 'OPTIONS';
}

/**
 * The preflight response for a policy.
 *
 * A `204` is not by itself a passing preflight: it passes only if it carries
 * `Access-Control-Allow-Origin`, which is why this is built from the same `resolveCorsHeaders`
 * that answers the real request. Preflight and response can therefore never disagree about which
 * origins are allowed.
 */
export function handleCorsPreflight(
  policy: CorsPolicy,
  request: CorsRequestLike | null = null,
): Response {
  return new Response(null, {
    status: PREFLIGHT_STATUS,
    headers: resolveCorsHeaders(policy, request),
  });
}
