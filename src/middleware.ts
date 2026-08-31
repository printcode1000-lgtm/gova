import { businessApiOrigins } from "@/core/config/business-api-origins";
import {
  isBusinessApiPath,
  normalizeApiPath,
  ownedMethodsForPath,
  resolveRouteOwner,
} from "@asol/account-bridge/routes";
import { BROWSER_REQUEST_HEADERS, preflightFor } from "@asol/service-runtime-core";

/**
 * The gova transport-compatibility boundary.
 *
 * gova no longer implements any Business API. Clients that were built, shipped,
 * or installed before the cutover still address gova for them, so this boundary
 * keeps those requests working by sending each one to the deployment that owns
 * it, resolved from the same canonical route+method registry the client bridge
 * uses. New clients call the owner directly and never reach this code.
 *
 * `307` and not `308`: the redirect must preserve the method and body, and must
 * stay non-permanent so a client never caches gova as the owner of a route.
 *
 * The boundary is deliberately stateless. It classifies a path and a method and
 * returns a `Location`. It reads no database, no storage, no notification code,
 * and no server secret; it does not call `fetch`, so nothing about the request
 * or its credentials passes through gova on the way.
 */
export function middleware(request: Request): Response {
  const url = new URL(request.url);

  // A browser never follows a redirect on a preflight, so gova has to answer the
  // preflight itself or the request that would be redirected is never sent. The
  // answer is pure transport: the methods this path actually accepts — which may
  // be split across two owners, as `/api/products` is between reads and writes —
  // and the one header list every ASOL surface answers with. No deployment
  // accepts credentials, so this grants nothing.
  if (request.method === "OPTIONS") {
    const methods = ownedMethodsForPath(url.pathname);
    if (methods.length > 0) {
      return preflightFor(request, {
        methods: [...methods, "OPTIONS"].join(", "),
        headers: BROWSER_REQUEST_HEADERS,
      });
    }
  }
  const owner = resolveRouteOwner(request.method, url.pathname);
  if (!owner) {
    // Unowned Business API paths are a configuration error, not a pass-through:
    // gova has no implementation to fall back to.
    if (isBusinessApiPath(url.pathname)) {
      return Response.json(
        { error: "businessApiRouteHasNoOwner", route: normalizeApiPath(url.pathname) },
        { status: 502 },
      );
    }
    return new Response(null, { status: 200, headers: { "x-middleware-next": "1" } });
  }

  const origin = businessApiOrigins()[owner];
  if (!origin) {
    return Response.json(
      { error: "businessApiOwnerOriginNotConfigured", owner },
      { status: 502 },
    );
  }

  return new Response(null, {
    status: 307,
    headers: { location: `${origin}${url.pathname}${url.search}`, "cache-control": "no-store" },
  });
}

export const config = {
  /** Only Business API paths reach this boundary; pages and static assets never do. */
  matcher: ["/api/:path*"],
};
