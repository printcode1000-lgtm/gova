import assert from "node:assert/strict";
import {
  resolveClientRuntime,
  resolveServerRuntime,
} from "../src/core/config/runtime-context";

assert.equal(resolveServerRuntime({ nodeEnv: "development" }).deployment, "local-development");
assert.equal(resolveServerRuntime({ nodeEnv: "production", vercel: "1" }).deployment, "web-production");
assert.equal(resolveServerRuntime({ nodeEnv: "production", mode: "static" }).deployment, "static-export");
assert.equal(resolveServerRuntime({ nodeEnv: "development", dataSource: "cloud" }).dataSource, "cloud");
assert.equal(resolveServerRuntime({ nodeEnv: "development", provisioning: "true" }).isDevelopment, false);
assert.equal(
  resolveClientRuntime({ mode: "static", apiBaseUrl: "https://api.example.test" }).deployment,
  "static-export",
);
assert.equal(
  resolveClientRuntime({ mode: "production", platform: "android", native: true }).dataSource,
  "cloud",
);
assert.equal(
  resolveClientRuntime({ mode: "development", platform: "ios", native: true }).isDevelopment,
  false,
);

console.log("runtime context: development web, production web, static web, Android, iOS, and provisioning verified");
