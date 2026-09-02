import { NextResponse } from 'next/server';
import { createServiceProxy } from '@asol/service-runtime-core';

/**
 * The deployment's CORS boundary.
 *
 * Route files answer only for paths they implement; everything else reaches
 * Next's own handling, whose bare `204` preflight has no
 * `Access-Control-Allow-Origin`. The browser then blocks the request and the
 * caller sees a network outage instead of the `404` the server meant to send.
 * See docs/08-troubleshooting/problems/owned-route-not-shipped.md.
 */
const serviceProxy = createServiceProxy();

export function proxy(request: Request): Response {
  return serviceProxy(request, () => NextResponse.next());
}

export const config = { matcher: '/api/:path*' };
