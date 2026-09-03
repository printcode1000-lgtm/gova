import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { BROWSER_REQUEST_HEADERS } from "@asol/cors";
import { createServiceProxy } from "@asol/service-runtime-core";

/**
 * Every deployment answers a preflight, for every path it can receive.
 *
 * A `204` is not a passing preflight. A preflight passes only if it carries
 * `Access-Control-Allow-Origin`; without it the browser refuses to send the real
 * request, and the caller sees `Unable to reach the server` — a network outage,
 * for a server that is up and would have answered.
 *
 * Two production outages came from that gap, and one of them came from *this*
 * check being written the shallow way. The migration audit recorded "CORS
 * verified on every origin" after seeing `204` from each account and never
 * looking at the headers. `asol-control` was answering every preflight with a
 * bare `204`, so the whole Super Admin console — user search, System Logs, OTA
 * administration, build jobs — was unreachable from a browser while every
 * server-side probe passed.
 *
 * So this test asserts the header, never the status alone, and it asserts it for
 * a path the deployment does *not* implement: an unshipped or mistyped route is
 * exactly where the boundary used to disappear.
 */
const ROOT = process.cwd();
const SERVICES = [
  "control",
  "notifications",
  "products",
  "orders",
  "profiles",
  "submain",
  "sub2main",
];

/** Each service must install the boundary, not rely on its route files. */
for (const service of SERVICES) {
  const proxyPath = path.join(ROOT, "services", service, "src", "proxy.ts");
  assert.ok(
    existsSync(proxyPath),
    `services/${service} has no CORS boundary. A route file cannot answer for a path it does not implement.`,
  );
  const source = readFileSync(proxyPath, "utf8");
  assert.match(
    source,
    /createServiceProxy\(/,
    `services/${service}/src/proxy.ts must use the shared boundary, not a local copy.`,
  );
  assert.match(
    source,
    /matcher:\s*['"]\/api\/:path\*['"]/,
    `services/${service}/src/proxy.ts must cover every /api path, including unimplemented ones.`,
  );
}

/** The boundary itself: a preflight for an unimplemented path still answers. */
const proxy = createServiceProxy();
const unknown = new Request("https://service.example/api/not-shipped", {
  method: "OPTIONS",
  headers: {
    origin: "https://gova-swart.vercel.app",
    "access-control-request-method": "DELETE",
    "access-control-request-headers": "x-asol-session-token",
  },
});
const preflight = proxy(unknown, () => new Response(null, { status: 404 }));

assert.equal(preflight.status, 204, "A preflight is answered, not passed through to a 404.");
assert.equal(
  preflight.headers.get("access-control-allow-origin"),
  "https://gova-swart.vercel.app",
  "A preflight without an allowed origin is refused by the browser as a network failure.",
);
assert.match(
  preflight.headers.get("access-control-allow-methods") ?? "",
  /DELETE/,
  "The methods a client sends must be allowed, or the request never leaves the browser.",
);
assert.equal(
  preflight.headers.get("access-control-allow-headers"),
  BROWSER_REQUEST_HEADERS.join(", "),
  "The header list is shared: no origin may answer a narrower list than the client sends.",
);

/** A real response keeps its own headers and gains the boundary's. */
const answered = proxy(
  new Request("https://service.example/api/health", {
    headers: { origin: "https://gova-swart.vercel.app" },
  }),
  () => new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json" } }),
);
assert.equal(answered.status, 200);
assert.equal(answered.headers.get("content-type"), "application/json");
assert.equal(
  answered.headers.get("access-control-allow-origin"),
  "https://gova-swart.vercel.app",
  "Every /api response carries the boundary's origin header.",
);

/** Non-API paths are untouched: this boundary is for the API surface only. */
const page = proxy(
  new Request("https://service.example/", { method: "OPTIONS" }),
  () => new Response(null, { status: 405 }),
);
assert.equal(page.status, 405, "A non-/api path is passed through unchanged.");

console.log(
  `service CORS boundary: ${SERVICES.length} deployment(s) install it; preflights answer with headers, including for unimplemented paths.`,
);
