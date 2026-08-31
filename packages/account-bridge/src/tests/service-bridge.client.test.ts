import assert from "node:assert/strict";

import {
  resolveServiceOriginForRuntime,
  type ServiceBridgeRuntime,
} from "@asol/account-bridge";

const origins = {
  control: "https://control.example",
  notifications: "https://notifications.example",
  products: "https://products.example",
  orders: "https://orders.example",
  profiles: "https://profiles.example",
  submain: "https://submain.example",
  sub2main: "https://sub2main.example",
};

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

// Local development resolves the owner exactly as production does. It used to
// answer `null` here and fall back to the main app, which meant a developer
// never exercised the routing the browser would use.
assert.equal(
  resolveServiceOriginForRuntime(
    "GET",
    "/api/products?id=local-product",
    runtime({ developmentBuild: true, deployment: "local-development" }),
  ),
  origins.products,
);

assert.equal(
  resolveServiceOriginForRuntime("GET", "/api/products?id=deployed-product", runtime()),
  origins.products,
);

assert.equal(
  resolveServiceOriginForRuntime("POST", "/api/products", runtime()),
  origins.sub2main,
  "product writes must route to sub2main",
);

assert.equal(
  resolveServiceOriginForRuntime("PUT", "/api/profile/editor", runtime()),
  origins.sub2main,
  "profile writes must route to sub2main",
);

assert.equal(
  resolveServiceOriginForRuntime("POST", "/api/orders/from-cart", runtime()),
  origins.submain,
);

assert.equal(
  resolveServiceOriginForRuntime("GET", "/api/search/products", runtime()),
  origins.submain,
);

// Control owns the administrative families on every method.
assert.equal(
  resolveServiceOriginForRuntime("POST", "/api/super-admin/build-jobs", runtime()),
  origins.control,
);
assert.equal(
  resolveServiceOriginForRuntime("GET", "/api/system-logs", runtime()),
  origins.control,
);

assert.equal(
  resolveServiceOriginForRuntime("GET", "/api/products", runtime({ browser: false })),
  null,
);

for (const platform of ["android", "ios"] as const) {
  assert.equal(
    resolveServiceOriginForRuntime(
      "GET",
      "/api/products",
      runtime({ platform, deployment: "static-export", developmentBuild: true }),
    ),
    origins.products,
  );
}

console.log("Service bridge client tests passed.");
