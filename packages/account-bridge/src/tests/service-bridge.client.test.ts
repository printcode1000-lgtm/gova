import assert from "node:assert/strict";

import {
  resolveServiceOriginForRuntime,
  type ServiceBridgeRuntime,
} from "@asol/account-bridge";

const origins = {
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

assert.equal(
  resolveServiceOriginForRuntime(
    "GET",
    "/api/products?id=local-product",
    runtime({ developmentBuild: true, deployment: "local-development" }),
  ),
  null,
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
