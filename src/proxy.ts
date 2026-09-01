import { NextRequest, NextResponse } from 'next/server';
import { businessApiOrigins } from '@/core/config/business-api-origins';
import { getCorsOrigins } from '@/core/config/cors-origins';
import {
  isBusinessApiPath,
  normalizeApiPath,
  ownedMethodsForPath,
  resolveRouteOwner,
} from '@asol/account-bridge/routes';
import { BROWSER_REQUEST_HEADERS } from '@asol/service-runtime-core';

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = getCorsOrigins();
  return allowed.includes('*') || allowed.includes(origin);
}

/**
 * Every header a browser client may send cross-origin. Omitting one makes the preflight reject
 * the request before it is ever sent, which surfaces to the caller as an unreachable server
 * rather than as a CORS error.
 *
 * The list itself is `BROWSER_REQUEST_HEADERS` in `@asol/service-runtime-core`, shared with the
 * service deployments so no mirror can answer a narrower list than this one. This middleware
 * overrides the `headers()` entry in `next.config.ts` for `/api/*`; that entry reads the same
 * constant.
 */
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': BROWSER_REQUEST_HEADERS,
    'Access-Control-Max-Age': '86400',
  };

  const allowed = getCorsOrigins();
  if (allowed.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }

  return headers;
}

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);
  const pathname = request.nextUrl.pathname;

  if (request.method === 'OPTIONS') {
    const methods = ownedMethodsForPath(pathname);
    if (methods.length > 0) {
      const allowedMethods = methods.includes('GET')
        ? [...new Set([...methods, 'HEAD', 'OPTIONS'])]
        : [...new Set([...methods, 'OPTIONS'])];
      return new NextResponse(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': allowedMethods.join(', '),
          'Access-Control-Allow-Headers': BROWSER_REQUEST_HEADERS,
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    return new NextResponse(null, { status: 204, headers });
  }

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
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
