import { BROWSER_REQUEST_HEADERS } from './cors';

/**
 * One CORS boundary per deployment, in front of every `/api/*` request.
 *
 * A route file can only answer for a path it implements. Everything else — an
 * unknown path, a typo, a route whose owner has not shipped it yet — reaches
 * Next's own handling, which answers a preflight with a bare `204` and no
 * `Access-Control-Allow-Origin`. The browser then refuses to send the real
 * request and reports `Unable to reach the server`, so a plain `404` surfaces to
 * the user as a network outage and to the developer as a mystery.
 *
 * That is exactly how `POST /api/notifications/device-token` presented: push
 * opt-in and device removal both failed with `NetworkUnavailableError` for a
 * route that was simply not shipped on that account.
 *
 * Answering the preflight here covers every path the deployment can receive,
 * including the ones it does not implement. The response bodies stay with the
 * routes; this only guarantees the browser is allowed to see them.
 *
 * `credentials` are never allowed: the cross-origin contract is an explicit
 * signed header, never a cookie, so a permissive origin cannot be used to ride
 * on someone's session.
 */
export interface ServiceProxyOptions {
  /** Methods this deployment can receive. Defaults to the full browser set. */
  readonly methods?: string;
}

export function createServiceProxy(options: ServiceProxyOptions = {}) {
  const methods = options.methods ?? 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS';

  function corsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('origin');
    return {
      'Access-Control-Allow-Origin': origin ?? '*',
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': BROWSER_REQUEST_HEADERS,
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
  }

  return function proxy(request: Request, next: () => Response): Response {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith('/api/')) return next();

    const headers = corsHeaders(request);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const response = next();
    for (const [key, value] of Object.entries(headers)) {
      if (!response.headers.has(key)) response.headers.set(key, value);
    }
    return response;
  };
}
