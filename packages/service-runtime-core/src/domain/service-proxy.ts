import {
  BROWSER_REQUEST_HEADERS,
  BROWSER_REQUEST_METHODS,
  createCorsPolicy,
  handleCorsPreflight,
  isCorsPreflight,
  reflectRequestOrigin,
  setCorsHeaders,
  type CorsPolicy,
} from '@asol/cors';

/**
 * One CORS boundary per deployment, in front of every `/api/*` request.
 *
 * A route file can only answer for a path it implements. Everything else — an
 * unknown path, a typo, a route whose owner has not shipped it yet — reaches
 * Next's own handling, which answers a preflight with a bare `204` and no
 * allow-origin header. The browser then refuses to send the real
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
 * The envelope is `@asol/cors`, not a local record: `credentials` are never
 * allowed, because the cross-origin contract is an explicit signed header and
 * never a cookie, so a permissive origin cannot be used to ride on someone's
 * session.
 */
export interface ServiceProxyOptions {
  /**
   * The deployment's CORS policy. Defaults to the full browser method set, because a boundary
   * stands in front of paths it does not enumerate and cannot narrow what it has not seen.
   */
  readonly cors?: CorsPolicy;
}

const DEFAULT_PROXY_CORS = createCorsPolicy({
  origins: reflectRequestOrigin(),
  methods: BROWSER_REQUEST_METHODS,
  headers: BROWSER_REQUEST_HEADERS,
});

export function createServiceProxy(options: ServiceProxyOptions = {}) {
  const policy = options.cors ?? DEFAULT_PROXY_CORS;

  return function proxy(request: Request, next: () => Response): Response {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith('/api/')) return next();

    if (isCorsPreflight(request)) return handleCorsPreflight(policy, request);

    const response = next();
    setCorsHeaders(response.headers, policy, request, { overwrite: false });
    return response;
  };
}
