import { NextRequest, NextResponse } from 'next/server';
import { BROWSER_REQUEST_HEADERS } from '@asol/service-runtime-core';
import { getCorsOrigins } from '@/core/config/server-env';

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = getCorsOrigins();
  if (allowed.includes('*')) return true;
  return allowed.some((entry) => entry === origin || origin.startsWith(entry));
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

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': BROWSER_REQUEST_HEADERS,
    'Access-Control-Max-Age': '86400',
  };

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  } else if (getCorsOrigins().includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
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
