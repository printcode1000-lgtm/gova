import assert from "node:assert/strict";

import { isDevRuntime } from "../src/core/config/runtime-context.server";

const keys = [
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
  "ASOL_MODE",
  "NEXT_PUBLIC_ASOL_MODE",
  "ASOL_DATA_SOURCE",
  "ASOL_PROVISIONING",
  "TURSO_DATABASE_URL",
] as const;
const original = Object.fromEntries(
  keys.map((key) => [key, process.env[key]]),
);

try {
  for (const key of keys) delete process.env[key];
  // Next's ambient ProcessEnv marks NODE_ENV readonly. This script exists to compare
  // behaviour across environments, so it writes through Object.assign instead of widening
  // the global type — the restriction is right everywhere else.
  Object.assign(process.env, { NODE_ENV: "development" });
  process.env.TURSO_DATABASE_URL = "libsql://comparison-only";
  assert.equal(
    isDevRuntime(),
    true,
    "Comparison credentials must not switch development scans to cloud",
  );

  process.env.ASOL_MODE = "static";
  assert.equal(isDevRuntime(), false);
  delete process.env.ASOL_MODE;

  process.env.VERCEL = "1";
  assert.equal(isDevRuntime(), false);
  delete process.env.VERCEL;

  process.env.ASOL_PROVISIONING = "true";
  assert.equal(isDevRuntime(), false);
} finally {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else Object.assign(process.env, { [key]: value });
  }
}

console.log("Data health environment isolation passed.");
