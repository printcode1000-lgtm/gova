import assert from "node:assert/strict";

import { resolveServiceOriginForRuntime } from "../service-bridge.client";

const origins = {
  products: "https://products.example",
  orders: "https://orders.example",
  profiles: "https://profiles.example",
};

assert.equal(
  resolveServiceOriginForRuntime(
    "GET",
    "/api/products?id=local-product",
    { browser: true, developmentBuild: true, origins },
  ),
  null,
  "next dev must keep reads on the local API so local SQLite data is not mixed with a deployed service",
);

assert.equal(
  resolveServiceOriginForRuntime(
    "GET",
    "/api/products?id=deployed-product",
    { browser: true, developmentBuild: false, origins },
  ),
  origins.products,
  "production browser reads must still use the products service",
);
assert.equal(
  resolveServiceOriginForRuntime("POST", "/api/products", {
    browser: true,
    developmentBuild: false,
    origins,
  }),
  null,
  "writes must always stay on the main application",
);
assert.equal(
  resolveServiceOriginForRuntime("GET", "/api/products/not-owned", {
    browser: true,
    developmentBuild: false,
    origins,
  }),
  null,
  "the bridge must continue to match exact owned paths only",
);
assert.equal(
  resolveServiceOriginForRuntime("GET", "/api/products", {
    browser: false,
    developmentBuild: false,
    origins,
  }),
  null,
  "server-side reads must never call another deployment",
);

console.log("Service bridge client tests passed.");
