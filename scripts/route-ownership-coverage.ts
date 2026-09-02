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
 * What remains, and why. Both are package-level separations, not missing
 * handlers, and each is its own change:
 *
 * **The eight notification surfaces.** `notifications-service-module-contract`
 * forbids `@asol/notifications-composition` from reaching
 * `@/features/notifications` at all: the delivery core is a sealed package, and
 * its import surface is the deployment's file surface. The handlers those routes
 * need — token registration, push preferences, broadcast, the mobile-push
 * unlock — still live in the application feature. Serving them from this account
 * means moving those services into the sealed package, not widening the
 * composition. Reimplementing them against `@asol/data-core/notifications`
 * instead would fork the contract into two copies that drift.
 *
 * **`POST /api/ota/access`.** The access check needs `configureOtaCore` and
 * `otaReleaseService`, and every door that reaches them also reaches
 * `@asol/ota-core`'s client half — the OTA adapter, the query persister, six
 * Capacitor packages. `services:sync` refuses the account, correctly: a server
 * deployment must not carry native adapters. Narrowing one door at a time did
 * not converge, because the client and server halves of that package are not
 * separated.
 *
 * Both are live 404s, and both are tracked here rather than hidden.
 *
 * Each line is a live production 404. Delete a line when the owner ships it —
 * never add one: a new unshipped route is a new outage, and the gate exists to
 * refuse it. `docs/08-troubleshooting/problems/owned-route-not-shipped.md`
 * records what the backlog is and how to work it down.
 */
export const KNOWN_UNSHIPPED: readonly string[] = [
  "GET /api/notifications/broadcast/recipients",
  "POST /api/notifications/broadcast/send",
  "POST /api/notifications/mobile-push/unlock",
  "GET /api/notifications/preferences",
  "POST /api/notifications/preferences",
  "POST /api/notifications/recipient-tokens",
  "POST /api/ota/access",
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
