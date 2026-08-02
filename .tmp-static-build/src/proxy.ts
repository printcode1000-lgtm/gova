import { NextRequest, NextResponse } from 'next/server';
import { getCorsOrigins } from '@/core/config/server-env';

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = getCorsOrigins();
  if (allowed.includes('*')) return true;
  return allowed.some((entry) => entry === origin || origin.startsWith(entry));
}

/**
 * Must list every header a browser client may send cross-origin. Omitting one
 * makes the preflight reject the request before it is ever sent, which surfaces
 * to the caller as an unreachable server rather than as a CORS error.
 *
 * Keep in sync with the `headers()` entry in `next.config.ts`; this middleware
 * overrides those values for `/api/*`.
 */
const ALLOWED_REQUEST_HEADERS =
  'Content-Type, Authorization, Accept, X-Asol-Session-Token, X-Asol-Trace-Id';

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': ALLOWED_REQUEST_HEADERS,
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
