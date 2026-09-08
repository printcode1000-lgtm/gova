import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  assertServerDatabaseRuntime,
  type DatabaseRuntimeContext,
} from "./database-runtime-policy";

/**
 * The policy answers whether a runtime may open a server database, never which
 * one. It used to return `"sqlite"` for any runtime whose data source was
 * `local` — which every Development runtime was — so `npm run dev` served
 * application data from files while every deployed runtime served it from Turso.
 */

const webDev: DatabaseRuntimeContext = {
  isNative: false,
  platform: "web",
  isStatic: false,
  supportsServerApi: true,
};

const webProd: DatabaseRuntimeContext = {
  isNative: false,
  platform: "web",
  isStatic: false,
  supportsServerApi: true,
};

// Development and production are the same answer: allowed, and the same backend.
assert.doesNotThrow(() => assertServerDatabaseRuntime(webDev, false));
assert.doesNotThrow(() => assertServerDatabaseRuntime(webProd, false));

// Static export ships no server, so nothing in it may hold a database client.
assert.throws(
  () =>
    assertServerDatabaseRuntime(
      { isNative: false, platform: "web", isStatic: true, supportsServerApi: false },
      false,
    ),
  /static export/,
);

// Native runs the static bundle and reaches data through the Business APIs.
assert.throws(
  () =>
    assertServerDatabaseRuntime(
      { isNative: true, platform: "android", isStatic: false, supportsServerApi: false },
      false,
    ),
  /android/,
);

// A browser must never hold database credentials, whatever the deployment says.
assert.throws(() => assertServerDatabaseRuntime(webDev, true), /browser/);

/**
 * There is no backend selector left, and no data-source field to reintroduce
 * one through. A string check, because the risk is a future "temporary" local
 * switch rather than a bug in today's code.
 */
{
  const source = readFileSync(
    path.join(process.cwd(), "packages/data-core/src/core/database-runtime-policy.ts"),
    "utf8",
  );
  assert.doesNotMatch(source, /dataSource/);
  assert.doesNotMatch(source, /sqlite/i);
}

console.log("database-runtime-policy.test: ok — legality only, one backend, no local option");
