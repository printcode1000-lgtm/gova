import { publicEnv } from "@/core/config/public-env";

/**
 * The bridge between the main app and the products service.
 *
 * Neither backend knows the other exists: the main app has no code path to the
 * products deployment, and the products deployment has no path back. What
 * connects them is this module — it runs in the browser and decides, per
 * request, which origin should answer.
 *
 * Only **reads** are redirected. Creating, updating, or deleting a product also
 * rewrites denormalised counts in the profiles database, which the products
 * account has no credentials for, so writes stay on the main app. The split is
 * by HTTP method, not by path, which is why this is a function and not a table
 * of rewrites.
 */

/**
 * Product reads the products service serves.
 *
 * `/api/search/sellers` is deliberately absent: despite the name it reads the
 * profile shards, not products, so it stays on the main app.
 */
const PRODUCT_READ_ROUTES = new Set([
  "/api/products",
  "/api/products/reviews",
  "/api/search/products",
  "/api/search/fields",
]);

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Origin of the products service, or null when it is not configured. */
export function getProductsServiceUrl(): string | null {
  return publicEnv.productsUrl || null;
}

/** The path part of a route, ignoring any query string. */
function pathOf(route: string): string {
  const queryIndex = route.indexOf("?");
  return queryIndex === -1 ? route : route.slice(0, queryIndex);
}

/**
 * Where a request should go.
 *
 * Returns the products service origin for reads it serves, and `null` for
 * everything else — meaning "leave it alone, the main app answers".
 *
 * Server-side rendering always gets `null`: the main app must never call the
 * products service, and returning an origin here would make it do exactly that.
 */
export function resolveProductsServiceOrigin(
  method: string,
  route: string,
): string | null {
  if (!isBrowser()) return null;
  if (method.toUpperCase() !== "GET") return null;
  if (!PRODUCT_READ_ROUTES.has(pathOf(route))) return null;
  return getProductsServiceUrl();
}
