import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * An owner that does not ship the route it owns is a 404 in production.
 *
 * The route ownership registry decides which origin a client calls. The AST
 * inventory proves every Business API route+method has exactly one owner, and
 * the gova artifact scan proves gova no longer serves them. Nothing proved the
 * third thing: that the owner's deployment actually contains a handler.
 *
 * It does not, for a large part of the surface. `/api/profile/store-images`
 * reached production as a `307` to `asol-profiles`, which answered `404` —
 * reported by a real user session on `/home`. Every gate was green: ownership
 * was complete, gova was clean, and both smoke suites probe one route per
 * account, so they only ever asked about routes that exist.
 *
 * This module closes that hole. `KNOWN_UNSHIPPED` records the pairs that were
 * already broken when the check was written so the gate can be enforced now
 * instead of after the backlog clears; every entry is a production 404 and the
 * list may only shrink.
 */

const ROOT = process.cwd();

const OWNER_SERVICE_DIRS: Readonly<Record<string, string>> = {
  control: "services/control",
  notifications: "services/notifications",
  products: "services/products",
  orders: "services/orders",
  profiles: "services/profiles",
  submain: "services/submain",
  sub2main: "services/sub2main",
};

export interface OwnedRoute {
  readonly method: string;
  readonly route: string;
  readonly owner: string;
}

/**
 * Route+method pairs whose owner does not ship a handler.
 *
 * Each line is a live production 404. Delete a line when the owner ships it —
 * never add one: a new unshipped route is a new outage, and the gate exists to
 * refuse it. `docs/08-troubleshooting/problems/owned-route-not-shipped.md`
 * records what the backlog is and how to work it down.
 */
export const KNOWN_UNSHIPPED: readonly string[] = [
  "POST /api/account/delete",
  "GET /api/advertisements/featured-marquee",
  "PUT /api/advertisements/featured-marquee",
  "GET /api/advertisements/featured-marquee/version",
  "GET /api/advertisements/home-hero-slider",
  "PUT /api/advertisements/home-hero-slider",
  "GET /api/advertisements/home-hero-slider/version",
  "GET /api/advertisements/trending-ribbon",
  "PUT /api/advertisements/trending-ribbon",
  "GET /api/advertisements/trending-ribbon/version",
  "POST /api/contact",
  "GET /api/feature-flags",
  "PUT /api/feature-flags",
  "DELETE /api/follow",
  "POST /api/follow",
  "POST /api/follow/notifications",
  "GET /api/follow/status",
  "GET /api/notifications/broadcast/recipients",
  "POST /api/notifications/broadcast/send",
  "DELETE /api/notifications/device-token",
  "POST /api/notifications/device-token",
  "DELETE /api/notifications/devices",
  "GET /api/notifications/devices",
  "POST /api/notifications/mobile-push/unlock",
  "GET /api/notifications/preferences",
  "POST /api/notifications/preferences",
  "POST /api/notifications/recipient-tokens",
  "POST /api/notifications/test/self",
  "POST /api/notifications/test/send",
  "GET /api/orders/[orderId]",
  "POST /api/orders/[orderId]/actions",
  "POST /api/ota/access",
  "DELETE /api/products/reviews",
  "POST /api/products/reviews",
  "PUT /api/products/reviews",
  "POST /api/products/reviews/helpful",
  "DELETE /api/products/reviews/reply",
  "POST /api/products/reviews/reply",
  "GET /api/profile/discounts",
  "DELETE /api/profile/reviews",
  "GET /api/profile/reviews",
  "POST /api/profile/reviews",
  "PUT /api/profile/reviews",
  "POST /api/profile/reviews/helpful",
  "DELETE /api/profile/reviews/reply",
  "POST /api/profile/reviews/reply",
  "GET /api/profile/store-images",
  "POST /api/specialty-chat/messages",
  "POST /api/specialty-chat/preferences",
  "POST /api/specialty-chat/product-conversations",
  "POST /api/specialty-chat/profile-conversations",
  "POST /api/specialty-chat/receipts",
  "POST /api/specialty-chat/requests",
  "DELETE /api/storage/images/[imageKey]",
  "GET /api/storage/profiles/[profileId]",
];

/** Every route.ts a service ships, mapped to the methods it exports. */
export function shippedRoutes(serviceDir: string): Map<string, Set<string>> {
  const base = path.join(ROOT, serviceDir, "src", "app");
  const found = new Map<string, Set<string>>();
  if (!existsSync(base)) return found;

  const stack = [base];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (item.name !== "route.ts") continue;
      const apiPath = full.slice(base.length).replace(/\/route\.ts$/, "").replace(/\\/g, "/") || "/";
      const source = readFileSync(full, "utf8");
      const methods = new Set(
        [...source.matchAll(
          /export\s+(?:async\s+)?(?:function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g,
        )].map((match) => match[1]!),
      );
      found.set(apiPath, methods);
    }
  }
  return found;
}

/** Owned pairs whose owning deployment has no handler for them. */
export function unshippedOwnedRoutes(owned: readonly OwnedRoute[]): string[] {
  const shipped = new Map<string, Map<string, Set<string>>>();
  const missing: string[] = [];

  for (const { method, route, owner } of owned) {
    // OPTIONS is transport on each receiving origin, not business ownership.
    if (method === "OPTIONS") continue;
    const serviceDir = OWNER_SERVICE_DIRS[owner];
    if (!serviceDir) continue;
    if (!shipped.has(owner)) shipped.set(owner, shippedRoutes(serviceDir));
    const methods = shipped.get(owner)!.get(route);
    if (!methods || !methods.has(method)) missing.push(`${method} ${route}`);
  }
  return missing;
}
