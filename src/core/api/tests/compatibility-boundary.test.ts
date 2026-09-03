import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

// Set before the boundary is exercised, not before it is imported: the origins
// module reads the environment on each call, so a build-time snapshot cannot
// hide a stale value here.
process.env.NEXT_PUBLIC_ASOL_CONTROL_URL = "https://control.example";
process.env.NEXT_PUBLIC_ASOL_PRODUCTS_URL = "https://products.example";
process.env.NEXT_PUBLIC_ASOL_SUB2MAIN_URL = "https://sub2main.example";
process.env.NEXT_PUBLIC_ASOL_SUBMAIN_URL = "https://submain.example";
process.env.NEXT_PUBLIC_ASOL_ORDERS_URL = "https://orders.example";
process.env.NEXT_PUBLIC_ASOL_PROFILES_URL = "https://profiles.example";
process.env.ASOL_CORS_ORIGINS = "https://app.example";
delete process.env.NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL;

import { config, proxy } from "@/proxy";

function run(method: string, url: string, headers?: HeadersInit): Response {
  return proxy(new NextRequest(url, { method, headers }));
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

/** Exact allow-list entries are accepted on normal compatibility redirects. */
{
  const response = run("GET", "https://gova.example/api/products", {
    origin: "https://app.example",
  });
  assert.equal(response.headers.get("access-control-allow-origin"), "https://app.example");
  assert.equal(response.headers.get("vary"), "Origin");
}

/** An attacker-controlled host that merely starts with an allowed origin is rejected. */
{
  const response = run("GET", "https://gova.example/api/products", {
    origin: "https://app.example.evil.tld",
  });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
}

/**
 * gova answers the preflight itself: a browser never follows a redirect on one,
 * so a redirected preflight means the real request is never sent at all.
 */
{
  const response = proxy(
    new NextRequest("https://gova.example/api/products", {
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

/** A malicious prefix origin is not reflected by the preflight path either. */
{
  const response = run("OPTIONS", "https://gova.example/api/products", {
    origin: "https://app.example.evil.tld",
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
}

/** Wildcard mode is explicit and returns `*` rather than reflecting arbitrary input. */
{
  const original = process.env.ASOL_CORS_ORIGINS;
  process.env.ASOL_CORS_ORIGINS = "*";
  try {
    const response = run("GET", "https://gova.example/api/products", {
      origin: "https://random.example",
    });
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(response.headers.get("vary"), null);
  } finally {
    process.env.ASOL_CORS_ORIGINS = original;
  }
}

/** Exact-origin mode does not invent CORS permission for requests without Origin. */
{
  const response = run("GET", "https://gova.example/api/products");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
}

/** A suffix-spoofed origin must never be reflected, including on preflight. */
{
  const response = proxy(
    new NextRequest("https://gova.example/api/products", {
      method: "OPTIONS",
      headers: { origin: "https://app.example.evil.tld" },
    }),
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
}

/** A preflight for a path gova still owns is not intercepted. */
{
  const response = proxy(new NextRequest("https://gova.example/api/health", { method: "OPTIONS" }));
  assert.equal(response.status, 204);
}

/** Only API paths reach the boundary at all. */
assert.deepEqual(config.matcher, "/api/:path*");

/**
 * The boundary's imports are pinned.
 *
 * Its whole value is that it carries no business capability, and that is a
 * property of what it imports — not of what it currently happens to call.
 */
{
  const source = readFileSync(path.join(process.cwd(), "src/proxy.ts"), "utf8");
  const specifiers = [...source.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((match) => match[1]);
  assert.deepEqual(specifiers.sort(), [
    "@/core/config/business-api-origins",
    "@/core/config/cors-origins",
    "@asol/account-bridge/routes",
    "@asol/cors",
    "next/server",
  ]);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /DATABASE|TOKEN|SECRET|PASSWORD/);
}

console.log("  ✔ gova compatibility boundary: 307 by owner, exact CORS, no fallback, no capability.");
