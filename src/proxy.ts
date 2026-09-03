import { NextRequest, NextResponse } from 'next/server';
import { businessApiOrigins } from '@/core/config/business-api-origins';
import { getCorsOrigins } from '@/core/config/cors-origins';
import {
  isBusinessApiPath,
  normalizeApiPath,
  ownedMethodsForPath,
  resolveRouteOwner,
} from '@asol/account-bridge/routes';
import {
  BROWSER_REQUEST_HEADERS,
  BROWSER_REQUEST_METHODS,
  allowOrigins,
  createCorsPolicy,
  handleCorsPreflight,
  isCorsPreflight,
  resolveCorsHeaders,
  setCorsHeaders,
  withAllowedMethods,
} from '@asol/cors';

/**
 * The gova compatibility boundary's CORS policy.
 *
 * Unlike the service deployments, this one is an exact allow-list rather than an echo: the origins
 * come from `ASOL_CORS_ORIGINS`, comparison is exact, and an origin that merely starts with an
 * allowed one — `https://app.example.evil.tld` — is refused. The envelope itself is `@asol/cors`,
 * so this boundary and the six deployments cannot answer different request-header lists; a mirror
 * that advertises fewer headers than the client sends does not answer less, it makes the preflight
 * reject the call and the caller see an unreachable server.
 *
 * Built per request because the allow-list is read per call: a build-time snapshot would freeze a
 * stale value into the bundle.
 */
function corsPolicy() {
  return createCorsPolicy({
    origins: allowOrigins(getCorsOrigins()),
    methods: BROWSER_REQUEST_METHODS,
    headers: BROWSER_REQUEST_HEADERS,
  });
}

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const policy = corsPolicy();
  const pathname = request.nextUrl.pathname;

  if (isCorsPreflight(request)) {
    // A preflight advertises the methods this path is actually owned for, so a client is not told
    // it may send a verb no owner answers. A path with no owner still gets the boundary's own
    // envelope — a preflight the browser refuses is reported as a network outage, not a 404.
    const methods = ownedMethodsForPath(pathname);
    if (methods.length === 0) return handleCorsPreflight(policy, request);

    const owned = methods.includes('GET')
      ? [...new Set([...methods, 'HEAD', 'OPTIONS'])]
      : [...new Set([...methods, 'OPTIONS'])];
    return handleCorsPreflight(withAllowedMethods(policy, owned), request);
  }

  const headers = resolveCorsHeaders(policy, request);
  const owner = resolveRouteOwner(request.method, pathname);
  if (owner) {
    const businessOrigin = businessApiOrigins()[owner];
    if (!businessOrigin) {
      return NextResponse.json(
        { error: 'businessApiOwnerOriginNotConfigured', owner },
        { status: 502, headers },
      );
    }
    return new NextResponse(null, {
      status: 307,
      headers: {
        ...headers,
        location: `${businessOrigin}${pathname}${request.nextUrl.search}`,
        'cache-control': 'no-store',
      },
    });
  }

  if (isBusinessApiPath(pathname)) {
    return NextResponse.json(
      { error: 'businessApiRouteHasNoOwner', route: normalizeApiPath(pathname) },
      { status: 502, headers },
    );
  }

  const response = NextResponse.next();
  setCorsHeaders(response.headers, policy, request);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
