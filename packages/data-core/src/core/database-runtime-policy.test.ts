import assert from "node:assert/strict";

import {
  resolveServerDatabaseBackend,
  type DatabaseRuntimeContext,
} from "./database-runtime-policy";

const webDev: DatabaseRuntimeContext = {
  isNative: false,
  platform: "web",
  isStatic: false,
  supportsServerApi: true,
  dataSource: "local",
};

const webProd: DatabaseRuntimeContext = {
  isNative: false,
  platform: "web",
  isStatic: false,
  supportsServerApi: true,
  dataSource: "remote",
};

assert.equal(resolveServerDatabaseBackend(webDev, false), "sqlite");
assert.equal(resolveServerDatabaseBackend(webProd, false), "turso");
assert.throws(() =>
  resolveServerDatabaseBackend(
    {
      isNative: false,
      platform: "web",
      isStatic: true,
      supportsServerApi: false,
      dataSource: "remote",
    },
    false,
  ),
);
assert.throws(() =>
  resolveServerDatabaseBackend(
    {
      isNative: true,
      platform: "android",
      isStatic: false,
      supportsServerApi: false,
      dataSource: "local",
    },
    false,
  ),
);
assert.throws(() => resolveServerDatabaseBackend(webDev, true));

console.log("database-runtime-policy.test: ok");
