import { resolveCorsHeaders } from './headers';
import type { CorsPolicy, CorsRequestLike } from './types';

export interface SetCorsHeadersOptions {
  /**
   * Whether to replace a header the response already carries. `false` is for a boundary standing
   * in front of routes that answer for themselves: a route that already set its own origin header
   * has made a narrower decision than the boundary's, and the boundary must not widen it.
   */
  readonly overwrite?: boolean;
}

/**
 * Writes the policy's headers onto a mutable `Headers`, in place.
 *
 * In place, because the two proxies apply CORS to the result of `NextResponse.next()`, and
 * rebuilding that as a new `Response` drops the middleware control headers Next put on it — the
 * request then stops being forwarded at all.
 */
export function setCorsHeaders(
  target: Headers,
  policy: CorsPolicy,
  request: CorsRequestLike | null = null,
  options: SetCorsHeadersOptions = {},
): void {
  const overwrite = options.overwrite ?? true;
  for (const [key, value] of Object.entries(resolveCorsHeaders(policy, request))) {
    if (!overwrite && target.has(key)) continue;
    target.set(key, value);
  }
}

/**
 * Copies the policy's headers onto a response that already exists, preserving status and body.
 *
 * Returns a new `Response` rather than mutating: a response that came back from `fetch` has
 * immutable headers, and an error response built by a route must keep its own status. An error
 * response has to carry CORS too — without it the browser reports a CORS failure instead of the
 * error the surface actually returned, and the real cause never reaches the caller.
 */
export function withCorsHeaders(
  response: Response,
  policy: CorsPolicy,
  request: CorsRequestLike | null = null,
): Response {
  const headers = new Headers(response.headers);
  setCorsHeaders(headers, policy, request);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
