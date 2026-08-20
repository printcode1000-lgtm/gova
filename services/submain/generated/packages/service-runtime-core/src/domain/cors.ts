/**
 * The CORS envelope every service deployment answers with.
 *
 * The browser is the only caller and no deployment accepts credentials — the bridge sends
 * `credentials: "omit"` — so echoing the request origin cannot be used to ride on someone's
 * session. That reasoning was repeated, in five copies, in five files; it is stated once here.
 *
 * The method and header lists stay per-service because they are not the same fact: a read-only
 * deployment that advertises `POST` is describing a route it does not have.
 */
export interface CorsPolicy {
  /** e.g. `'GET, OPTIONS'`. */
  methods: string;
  /** e.g. `'Content-Type, Accept'`. */
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
