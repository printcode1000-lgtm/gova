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
 * What remains, and why:
 *
 * - **notifications (9).** They reach the account's database through
 *   `notificationsServer.execute`, a general command dispatcher. Exposing it
 *   from the composition would pull the users repository onto an account that
 *   must never hold it — the composition says so in its own comment. Each needs
 *   a narrow, named function on `@asol/notifications-composition` instead.
 * - **`/api/orders/[orderId]` and its actions (2).** The handler joins order
 *   shards, profile snapshots and system logging; transcribing it into a mirror
 *   would fork a long contract. Extract the handler into a shared server module
 *   both the canonical route and the mirror call.
 * - **`POST /api/ota/access` (1).** `@/features/ota/server` imports `@/core/api`,
 *   a client door, so mirroring it drags react-query and the Capacitor adapters
 *   into a server deployment. The OTA feature's server seam has to be separated
 *   from its client one first.
 *
 * Each line is a live production 404. Delete a line when the owner ships it —
 * never add one: a new unshipped route is a new outage, and the gate exists to
 * refuse it. `docs/08-troubleshooting/problems/owned-route-not-shipped.md`
 * records what the backlog is and how to work it down.
 */
export const KNOWN_UNSHIPPED: readonly string[] = [
  "GET /api/notifications/broadcast/recipients",
  "POST /api/notifications/broadcast/send",
  "DELETE /api/notifications/device-token",
  "POST /api/notifications/device-token",
  "POST /api/notifications/mobile-push/unlock",
  "GET /api/notifications/preferences",
  "POST /api/notifications/preferences",
  "POST /api/notifications/recipient-tokens",
  "POST /api/notifications/test/send",
  "GET /api/orders/[orderId]",
  "POST /api/orders/[orderId]/actions",
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
