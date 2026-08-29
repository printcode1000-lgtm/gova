/**
 * The CORS envelope every service deployment answers with.
 *
 * The browser is the only caller and no deployment accepts credentials — the bridge sends
 * `credentials: "omit"` — so echoing the request origin cannot be used to ride on someone's
 * session. That reasoning was repeated, in five copies, in five files; it is stated once here.
 *
 * The method list stays per-service because it is a real per-service fact: a read-only deployment
 * that advertises `POST` is describing a route it does not have. The header list is not — see
 * `BROWSER_REQUEST_HEADERS`.
 */
/**
 * Every request header a browser client may send to any ASOL deployment.
 *
 * Unlike the method list, this is not a per-service fact: one client speaks to all of them, and a
 * deployment that advertises fewer headers than the client can send does not "answer less" — the
 * preflight rejects the request before it is sent, and the caller sees an unreachable server
 * rather than a CORS error. That is exactly how a narrower list on the profiles mirror surfaced.
 *
 * So the list is stated once, here, and the main application's `src/proxy.ts` and `next.config.ts`
 * read it from this door. Widening it is safe: no deployment accepts credentials, so a header the
 * service ignores stays ignored.
 */
export const BROWSER_REQUEST_HEADERS =
  'Content-Type, Authorization, Accept, X-Asol-Session-Token, X-Asol-Trace-Id';

export interface CorsPolicy {
  /** e.g. `'GET, OPTIONS'`. */
  methods: string;
  /** The request headers a browser may send; use `BROWSER_REQUEST_HEADERS` unless a deployment
   * genuinely accepts fewer. */
  headers: string;
}

export function corsHeadersFor(request: Request, policy: CorsPolicy): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': request.headers.get('origin') ?? '*',
    'Access-Control-Allow-Methods': policy.methods,
    'Access-Control-Allow-Headers': policy.headers,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function preflightFor(request: Request, policy: CorsPolicy): Response {
  return new Response(null, { status: 204, headers: corsHeadersFor(request, policy) });
}

/** Copies the CORS headers onto a response that already exists, preserving status and body. */
export function withCorsFor(request: Request, response: Response, policy: CorsPolicy): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeadersFor(request, policy))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
