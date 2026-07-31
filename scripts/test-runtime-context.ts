import assert from "node:assert/strict";
import { resolveServerRuntime } from "../src/core/config/runtime-context";

assert.equal(resolveServerRuntime({ nodeEnv: "development" }).deployment, "local-development");
assert.equal(resolveServerRuntime({ nodeEnv: "production", vercel: "1" }).deployment, "web-production");
assert.equal(resolveServerRuntime({ nodeEnv: "production", mode: "static" }).deployment, "static-export");
assert.equal(resolveServerRuntime({ nodeEnv: "development", dataSource: "cloud" }).dataSource, "cloud");
assert.equal(resolveServerRuntime({ nodeEnv: "development", provisioning: "true" }).isDevelopment, false);

console.log("runtime context: local, production, static, cloud, and provisioning modes verified");
