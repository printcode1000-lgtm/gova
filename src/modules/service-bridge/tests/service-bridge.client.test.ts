import assert from "node:assert/strict";

import {
  resolveServiceOriginForRuntime,
  type ServiceBridgeRuntime,
} from "@asol/account-bridge";

const origins = {
  products: "https://products.example",
  orders: "https://orders.example",
  profiles: "https://profiles.example",
};

/** The web defaults; each case overrides only what it is about. */
function runtime(overrides: Partial<ServiceBridgeRuntime> = {}): ServiceBridgeRuntime {
  return {
    browser: true,
    developmentBuild: false,
    platform: "web",
    deployment: "web-production",
    origins,
    ...overrides,
  };
}

assert.equal(
  resolveServiceOriginForRuntime(
    "GET",
    "/api/products?id=local-product",
    runtime({ developmentBuild: true, deployment: "local-development" }),
  ),
  null,
  "next dev must keep reads on the local API so local SQLite data is not mixed with a deployed service",
);

assert.equal(
  resolveServiceOriginForRuntime("GET", "/api/products?id=deployed-product", runtime()),
  origins.products,
  "production browser reads must still use the products service",
);

assert.equal(
  resolveServiceOriginForRuntime("POST", "/api/products", runtime()),
  null,
  "writes must always stay on the main application",
);

assert.equal(
  resolveServiceOriginForRuntime("GET", "/api/products/not-owned", runtime()),
  null,
  "the bridge must continue to match exact owned paths only",
);

assert.equal(
  resolveServiceOriginForRuntime("GET", "/api/products", runtime({ browser: false })),
  null,
  "server-side reads must never call another deployment",
);

// A Capacitor WebView is served from a localhost-like origin and is built from
// the same bundle as a dev build. Reading either signal as "local development"
// would route every read back to the main account and silently disable the
// service split on Android and iOS.
for (const platform of ["android", "ios"] as const) {
  assert.equal(
    resolveServiceOriginForRuntime(
      "GET",
      "/api/products",
      runtime({ platform, deployment: "static-export", developmentBuild: true }),
    ),
    origins.products,
    `${platform} must reach the products service even on a localhost-like origin`,
  );
}

console.log("Service bridge client tests passed.");
