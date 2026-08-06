import { publicEnv } from "@/core/config/public-env";

/**
 * The connector between the main app and the read-only service deployments.
 *
 * Each deployed module runs on its own Vercel account and none of them may call
 * another. This module decides, per request, which origin should answer — and
 * it runs in the browser and nowhere else, which is what keeps the accounts
 * independent of each other.
 *
 * One table, not one module per service: the routing rule is identical for
 * every service, and a second copy of it would be a place for the two to drift.
 *
 * Push notifications use a different connector — see
 * `src/modules/notification-bridge`. That one carries a signed authorisation
 * after a response; this one only chooses an address before a request.
 */

type ServiceKey = "products" | "orders";

/**
 * Read routes each service serves, matched on the exact path.
 *
 * Exact matching is deliberate. `/api/orders` is served by the orders service
 * while `/api/orders/<id>` is not — the detail view enriches the order with
 * profile contacts and store details, which that account cannot read. A prefix
 * rule would have swept it up. `/api/search/sellers` is absent for the same
 * kind of reason: despite the name it reads the profile shards, not products.
 */
const READ_ROUTES: Record<string, ServiceKey> = {
  "/api/products": "products",
  "/api/products/reviews": "products",
  "/api/search/products": "products",
  "/api/search/fields": "products",
  "/api/pharmacy-profile-catalog": "products",
  "/api/orders": "orders",
};

function originFor(service: ServiceKey): string | null {
  const value = service === "products" ? publicEnv.productsUrl : publicEnv.ordersUrl;
  return value || null;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** The path part of a route, ignoring any query string. */
function pathOf(route: string): string {
  const queryIndex = route.indexOf("?");
  return queryIndex === -1 ? route : route.slice(0, queryIndex);
}

/**
 * Where a request should go.
 *
 * Returns a service origin for reads that service owns, and `null` for
 * everything else — meaning "leave it alone, the main app answers".
 *
 * Two guards matter more than the table:
 *
 * - **Browser only.** Server-side rendering always gets `null`. Returning an
 *   origin there would make the main app call another account directly, which
 *   is the one thing this design forbids.
 * - **GET only.** Every write touches data the read services have no
 *   credentials for — product writes rewrite profile counts, order writes span
 *   nine shards plus profiles and products — so a redirected write would reach
 *   a deployment that cannot complete it.
 *
 * An unconfigured origin degrades to the main app, which still serves these
 * routes. That is a safe default, not a broken one.
 */
export function resolveServiceOrigin(
  method: string,
  route: string,
): string | null {
  if (!isBrowser()) return null;
  if (method.toUpperCase() !== "GET") return null;
  const service = READ_ROUTES[pathOf(route)];
  if (!service) return null;
  return originFor(service);
}
