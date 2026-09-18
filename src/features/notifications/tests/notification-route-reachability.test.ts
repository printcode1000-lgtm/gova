/**
 * Contract test: every notification call a client makes reaches a handler.
 *
 * The native sender's `recipient-tokens` and `mobile-push/unlock` were owned by
 * an account that shipped no handler, so on Android and iOS every push was a
 * silent `404` after a `307` — while the business API, health, and every gate
 * stayed green. This file walks the calls the clients actually make, from their
 * source, and requires each one to resolve to `notifications` and to be served
 * there with that method and a CORS preflight.
 *
 * The call table is read from the client source rather than restated, so a new
 * client call with no handler fails here instead of in production.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  ROUTE_OWNERSHIP,
  resolveRouteOwner,
} from "@asol/account-bridge/routes";

import { shippedRoutes } from "../../../../scripts/route-ownership-coverage";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

// ── the calls the clients make ──────────────────────────────────────────────

const routesSource = read("src/core/api/asol-api-routes.ts");
const notificationsBlock = routesSource.slice(
  routesSource.indexOf("notifications: {"),
  routesSource.indexOf("},", routesSource.indexOf("notifications: {")),
);
const routeKeys = new Map(
  [...notificationsBlock.matchAll(/(\w+):\s*"(\/api\/notifications\/[^"]+)"/g)].map(
    (match) => [match[1]!, match[2]!],
  ),
);
assert.ok(routeKeys.size >= 9, "ASOL_API_ROUTES.notifications could not be read");

type Call = { method: string; path: string; from: string };
const calls: Call[] = [];

const apiService = "src/features/notifications/infrastructure/http/notification-api-service.ts";
for (const match of read(apiService).matchAll(
  /asolApi\.(get|post|put|patch|delete)<[\s\S]*?>\(\s*`?(?:\$\{)?ASOL_API_ROUTES\.notifications\.(\w+)/g,
)) {
  const routePath = routeKeys.get(match[2]!);
  assert.ok(routePath, `${apiService} calls an unknown route key ${match[2]}`);
  calls.push({ method: match[1]!.toUpperCase(), path: routePath, from: apiService });
}

const bridgeCalls: Array<[string, RegExp]> = [
  ["packages/account-bridge/src/notifications.ts", /SEND_PATH = '([^']+)'/],
  ["packages/account-bridge/src/mobile-push/deliver.ts", /RECIPIENT_TOKENS_PATH = '([^']+)'/],
  ["packages/account-bridge/src/mobile-push/enrollment.ts", /UNLOCK_PATH = '([^']+)'/],
];
for (const [file, pattern] of bridgeCalls) {
  const found = read(file).match(pattern);
  assert.ok(found, `${file} no longer declares its route constant`);
  calls.push({ method: "POST", path: found[1]!, from: file });
}

// The client surface this contract was written against. A shrinking table means
// a call was lost from the parse, not that the client stopped making it.
const expected = [
  "POST /api/notifications/device-token",
  "DELETE /api/notifications/device-token",
  "GET /api/notifications/devices",
  "DELETE /api/notifications/devices",
  "GET /api/notifications/preferences",
  "POST /api/notifications/preferences",
  "GET /api/notifications/broadcast/recipients",
  "POST /api/notifications/broadcast/send",
  "POST /api/notifications/test/send",
  "POST /api/notifications/test/self",
  "POST /api/notifications/send",
  "POST /api/notifications/recipient-tokens",
  "POST /api/notifications/mobile-push/unlock",
];
const seen = new Set(calls.map((call) => `${call.method} ${call.path}`));
for (const pair of expected) {
  assert.ok(seen.has(pair), `The client no longer makes ${pair}, or the parse missed it.`);
}

// ── every call resolves to notifications and is served there ────────────────

const served = shippedRoutes("services/notifications");
for (const call of calls) {
  const label = `${call.method} ${call.path} (from ${call.from})`;
  assert.equal(
    resolveRouteOwner(call.method, call.path),
    "notifications",
    `${label} must be owned by the notifications account.`,
  );
  const methods = served.get(call.path);
  assert.ok(methods, `${label}: services/notifications ships no route file — a live 404.`);
  assert.ok(methods.has(call.method), `${label}: the route file does not export ${call.method}.`);
  assert.ok(
    methods.has("OPTIONS"),
    `${label}: no OPTIONS export, so the browser preflight fails as a network error.`,
  );
}

// Development serves the same surface from the application itself.
for (const call of calls) {
  const appRoute = path.join(root, "src/app", call.path, "route.ts");
  assert.ok(existsSync(appRoute), `Development has no handler for ${call.path}.`);
  assert.match(
    readFileSync(appRoute, "utf8"),
    new RegExp(`export\\s+(?:async\\s+)?function\\s+${call.method}\\b`),
    `Development's ${call.path} does not export ${call.method}.`,
  );
}

// ── one owner, one deployment ───────────────────────────────────────────────

const notificationEntries = ROUTE_OWNERSHIP.filter((entry) =>
  entry.pattern.startsWith("/api/notifications"),
);
assert.deepEqual(
  notificationEntries.map((entry) => `${entry.owner} ${entry.pattern}`),
  ["notifications /api/notifications/**"],
  "The notification surface has exactly one owner; a narrower entry re-splits it.",
);

for (const service of readdirSync(path.join(root, "services"))) {
  if (service === "notifications") continue;
  const stray = [...shippedRoutes(`services/${service}`).keys()].filter((route) =>
    route.startsWith("/api/notifications/"),
  );
  assert.deepEqual(
    stray,
    [],
    `services/${service} ships notification routes nobody routes to: ${stray.join(", ")}`,
  );
}

// ── the session-bound service routes authorise with the signed session ───────

const sessionBound: Record<string, RegExp> = {
  "devices": /account\.assertSignedIn\(request\)/,
  "test/self": /account\.assertSignedIn\(request\)/,
  "recipient-tokens": /account\.assertSignedIn\(request\)/,
  "mobile-push/unlock": /account\.assertSignedIn\(request\)/,
  "test/send": /devices\.assertSuperAdmin\(request\)|account\.assertSignedIn\(request\)/,
  "broadcast/recipients": /devices\.assertSuperAdmin\(request\)/,
  "broadcast/send": /devices\.assertSuperAdmin\(request\)/,
};
for (const [route, guard] of Object.entries(sessionBound)) {
  const file = `services/notifications/src/app/api/notifications/${route}/route.ts`;
  const source = read(file);
  assert.match(source, guard, `${file} must authorise with the signed session.`);
  assert.match(
    source,
    /from '@asol\/notifications-composition'/,
    `${file} must reach the application only through the composition.`,
  );
  assert.doesNotMatch(source, /from '@\//, `${file} must not import the application directly.`);
}

// ── every preflight is answered by the boundary, with the session header ─────
// The route files' own CORS lists are narrower; the proxy answers every
// preflight first, so it alone decides whether `x-asol-session-token` may be sent.
const proxy = read("services/notifications/src/proxy.ts");
assert.match(proxy, /createServiceProxy\(\)/, "the proxy must use the default browser policy");
assert.match(proxy, /matcher: '\/api\/:path\*'/, "the proxy must cover every API path");

console.log("Notification route reachability passed.");
