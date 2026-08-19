import assert from "node:assert/strict";

import {
  resolveClientRuntime,
  resolveServerRuntime,
} from "@/core/config/runtime-context";
import { resolveServerDatabaseBackend } from "./database-runtime-policy";

assert.equal(
  resolveServerDatabaseBackend(resolveServerRuntime({ nodeEnv: "development" }), false),
  "sqlite",
);
assert.equal(
  resolveServerDatabaseBackend(
    resolveServerRuntime({ nodeEnv: "production", vercel: "1" }),
    false,
  ),
  "turso",
);
assert.throws(() =>
  resolveServerDatabaseBackend(
    resolveClientRuntime({ mode: "static", apiBaseUrl: "https://api.example.test" }),
    false,
  ),
);
assert.throws(() =>
  resolveServerDatabaseBackend(
    resolveClientRuntime({ mode: "production", platform: "android", native: true }),
    false,
  ),
);
assert.throws(() =>
  resolveServerDatabaseBackend(
    resolveClientRuntime({ mode: "production", platform: "ios", native: true }),
    false,
  ),
);
assert.throws(() =>
  resolveServerDatabaseBackend(resolveServerRuntime({ nodeEnv: "production" }), true),
);

console.log("data access runtime policy: local SQLite, cloud Turso, static, Android, iOS, and browser guards verified");
