import { ANY_ORIGIN, isOriginAllowed } from './origins';
import type { CorsOriginPolicy, CorsPolicy, CorsRequestLike } from './types';

/**
 * The only place in the repository where an `Access-Control-*` header name is written.
 *
 * `npm run architecture:check` enforces that, so a route or a proxy cannot quietly grow a sixth
 * copy of this record. See docs/05-platform-features/sealed-packages/cors-module.md.
 */
const ALLOW_ORIGIN = 'Access-Control-Allow-Origin';
const ALLOW_METHODS = 'Access-Control-Allow-Methods';
const ALLOW_HEADERS = 'Access-Control-Allow-Headers';
const ALLOW_CREDENTIALS = 'Access-Control-Allow-Credentials';
const EXPOSE_HEADERS = 'Access-Control-Expose-Headers';
const MAX_AGE = 'Access-Control-Max-Age';
const VARY = 'Vary';

/** Reads the caller's origin. `null` for a same-origin, server-side, or absent request. */
export function requestOrigin(request: CorsRequestLike | null | undefined): string | null {
  return request?.headers.get('origin') ?? null;
}

interface OriginDecision {
  /** The value to send, or `null` to send no origin header at all. */
  readonly value: string | null;
  /** Whether the answer depends on the request's origin, and therefore needs `Vary: Origin`. */
  readonly varies: boolean;
}

/**
 * Resolves the one header that decides everything else.
 *
 * A disallowed origin gets `value: null` — no header, rather than a header naming someone else.
 * The browser then blocks the read, which is the correct outcome and the only one that cannot be
 * mistaken for permission.
 */
function decideOrigin(origins: CorsOriginPolicy, origin: string | null): OriginDecision {
  if (origins.kind === 'wildcard') return { value: ANY_ORIGIN, varies: false };
  if (origins.kind === 'reflect') return { value: origin ?? ANY_ORIGIN, varies: true };
  // A `*` entry is an explicit wildcard, so the response is identical for every caller and must
  // not be marked as varying — a needless `Vary: Origin` fragments every shared cache in front of
  // it, once per origin that ever asks.
  if (origins.origins.includes(ANY_ORIGIN)) return { value: ANY_ORIGIN, varies: false };
  if (isOriginAllowed(origin, origins.origins)) return { value: origin, varies: true };
  return { value: null, varies: true };
}

/**
 * The complete CORS header record for one policy and one request.
 *
 * Pass `null` for a surface that has no request in hand — a static header table, for instance.
 * A `reflect` policy then answers `*`, which is what a request carrying no origin gets anyway.
 *
 * `Vary: Origin` is emitted whenever the answer is origin-dependent, including when the origin was
 * *refused*: a shared cache that stored the refusal without it would go on refusing an origin that
 * is allowed. That is stricter than the per-surface copies this replaced, three of which emitted
 * `Vary` only on the success path.
 */
export function resolveCorsHeaders(
  policy: CorsPolicy,
  request: CorsRequestLike | null = null,
): Record<string, string> {
  const decision = decideOrigin(policy.origins, requestOrigin(request));
  const headers: Record<string, string> = {};

  if (decision.value !== null) headers[ALLOW_ORIGIN] = decision.value;
  if (policy.methods.length > 0) headers[ALLOW_METHODS] = policy.methods.join(', ');
  if (policy.headers.length > 0) headers[ALLOW_HEADERS] = policy.headers.join(', ');
  if (policy.exposeHeaders.length > 0) headers[EXPOSE_HEADERS] = policy.exposeHeaders.join(', ');
  if (policy.credentials) headers[ALLOW_CREDENTIALS] = 'true';
  if (policy.maxAgeSeconds !== null) headers[MAX_AGE] = String(policy.maxAgeSeconds);
  if (decision.varies) headers[VARY] = 'Origin';

  return headers;
}
