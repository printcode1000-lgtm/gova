import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  resolveClientRuntime,
  resolveServerRuntime,
} from "../src/core/config/runtime-context";

assert.equal(resolveServerRuntime({ nodeEnv: "development" }).deployment, "local-development");
assert.equal(resolveServerRuntime({ nodeEnv: "production", vercel: "1" }).deployment, "web-production");
assert.equal(resolveServerRuntime({ nodeEnv: "production", mode: "static" }).deployment, "static-export");
assert.equal(resolveServerRuntime({ nodeEnv: "development", provisioning: "true" }).isDevelopment, false);
assert.equal(
  resolveClientRuntime({ mode: "static", apiBaseUrl: "https://api.example.test" }).deployment,
  "static-export",
);
assert.equal(
  resolveClientRuntime({ mode: "production", platform: "android", native: true }).isNative,
  true,
);
assert.equal(
  resolveClientRuntime({ mode: "development", platform: "ios", native: true }).isDevelopment,
  false,
);

/**
 * Development is a deployment classification and nothing more.
 *
 * The runtime context used to carry a `dataSource` that Development resolved to
 * `local`, and every backend decision in the repository hung off it: a
 * filesystem SQLite database for server data, a filesystem provider for image
 * objects. That made `npm run dev` the one environment where a data-path bug
 * could not reproduce. The field is gone, and so is the environment variable
 * that set it — a string check here is what stops either from being reintroduced
 * as a "temporary" local switch.
 */
{
  const source = readFileSync(
    path.join(process.cwd(), "src/core/config/runtime-context.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /dataSource/,
    "runtime-context must not carry a data-source field: server data is Turso in every runtime.",
  );
  assert.doesNotMatch(
    source,
    /AppDataSource/,
    "AppDataSource selected between a local and a cloud backend; there is only one backend now.",
  );

  const serverSource = readFileSync(
    path.join(process.cwd(), "src/core/config/runtime-context.server.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    serverSource,
    /ASOL_DATA_SOURCE/,
    "ASOL_DATA_SOURCE must not be readable: no environment value may select a local database.",
  );

  // The context still has to describe the runtime, so the checks above cannot be
  // passing merely because the object became empty.
  const development = resolveServerRuntime({ nodeEnv: "development" });
  assert.equal(development.isDevelopment, true);
  assert.equal(development.supportsServerApi, true);
  assert.equal(development.platform, "web");
}

console.log(
  "runtime context: development web, production web, static web, Android, iOS, provisioning, and no data-source selector verified",
);
