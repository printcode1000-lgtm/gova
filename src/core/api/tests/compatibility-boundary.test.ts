import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

// Set before the boundary is exercised, not before it is imported: the origins
// module reads the environment on each call, so a build-time snapshot cannot
// hide a stale value here.
process.env.NEXT_PUBLIC_ASOL_CONTROL_URL = "https://control.example";
process.env.NEXT_PUBLIC_ASOL_PRODUCTS_URL = "https://products.example";
process.env.NEXT_PUBLIC_ASOL_SUB2MAIN_URL = "https://sub2main.example";
process.env.NEXT_PUBLIC_ASOL_SUBMAIN_URL = "https://submain.example";
process.env.NEXT_PUBLIC_ASOL_ORDERS_URL = "https://orders.example";
process.env.NEXT_PUBLIC_ASOL_PROFILES_URL = "https://profiles.example";
delete process.env.NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL;

import { config, middleware } from "@/middleware";

function run(method: string, url: string): Response {
  return middleware(new Request(url, { method }));
}

/** A control-owned route reaches control, method and body preserved by 307. */
{
  const response = run("POST", "https://gova.example/api/super-admin/build-jobs");
  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://control.example/api/super-admin/build-jobs",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
}

/** The query string survives; the boundary rewrites only the origin. */
{
  const response = run("GET", "https://gova.example/api/system-logs?limit=50&feature=ota");
  assert.equal(
    response.headers.get("location"),
    "https://control.example/api/system-logs?limit=50&feature=ota",
  );
}

/** Ownership is per method, not per path: the same path splits by verb. */
{
  assert.equal(
    run("GET", "https://gova.example/api/products").headers.get("location"),
    "https://products.example/api/products",
  );
  assert.equal(
    run("POST", "https://gova.example/api/products").headers.get("location"),
    "https://sub2main.example/api/products",
  );
}

/** gova still answers its own non-business routes itself. */
for (const route of ["/api/health", "/api/dev/anything"]) {
  const response = run("GET", `https://gova.example${route}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
}

/** A missing owner origin fails loudly. gova has no implementation to fall back to. */
{
  const response = run("POST", "https://gova.example/api/notifications/send");
  assert.equal(response.status, 502);
}

/** An owned-looking business path with no owner is a configuration error, not a pass-through. */
{
  const response = run("GET", "https://gova.example/api/not-a-registered-route");
  assert.equal(response.status, 502);
}

/**
 * gova answers the preflight itself: a browser never follows a redirect on one,
 * so a redirected preflight means the real request is never sent at all.
 */
{
  const response = middleware(
    new Request("https://gova.example/api/products", {
      method: "OPTIONS",
      headers: { origin: "https://app.example" },
    }),
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://app.example");
  // `/api/products` is split between owners, so the preflight has to advertise both halves.
  const methods = response.headers.get("access-control-allow-methods") ?? "";
  for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    assert.ok(methods.includes(method), `preflight omits ${method}`);
  }
  assert.match(response.headers.get("access-control-allow-headers") ?? "", /X-Asol-Session-Token/);
}

/** A preflight for a path gova still owns is not intercepted. */
{
  const response = middleware(new Request("https://gova.example/api/health", { method: "OPTIONS" }));
  assert.equal(response.headers.get("x-middleware-next"), "1");
}

/** Only API paths reach the boundary at all. */
assert.deepEqual(config.matcher, ["/api/:path*"]);

/**
 * The boundary's imports are pinned.
 *
 * Its whole value is that it carries no business capability, and that is a
 * property of what it imports — not of what it currently happens to call.
 */
{
  const source = readFileSync(path.join(process.cwd(), "src/middleware.ts"), "utf8");
  const specifiers = [...source.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((match) => match[1]);
  assert.deepEqual(specifiers.sort(), [
    "@/core/config/business-api-origins",
    "@asol/account-bridge/routes",
    "@asol/service-runtime-core",
  ]);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /process\.env/);
}

console.log("  ✔ gova compatibility boundary: 307 by owner, no fallback, no capability.");
