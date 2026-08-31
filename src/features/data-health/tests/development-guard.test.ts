import assert from "node:assert/strict";

import { assertDataHealthAllowed } from "../domain/development-guard.server";

const keys = [
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
  "ASOL_MODE",
  "NEXT_PUBLIC_ASOL_MODE",
  "ASOL_DATA_SOURCE",
  "ASOL_PROVISIONING",
  "GITHUB_ACTIONS",
] as const;
const original = Object.fromEntries(
  keys.map((key) => [key, process.env[key]]),
);

function resetEnv() {
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, { NODE_ENV: "development" });
}

try {
  resetEnv();
  assert.doesNotThrow(() => assertDataHealthAllowed());

  process.env.VERCEL = "1";
  assert.throws(() => assertDataHealthAllowed(), /dataHealthDevelopmentOnly/);
  delete process.env.VERCEL;

  process.env.ASOL_MODE = "static";
  assert.throws(() => assertDataHealthAllowed(), /dataHealthDevelopmentOnly/);
} finally {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else Object.assign(process.env, { [key]: value });
  }
}

console.log("Data health development guard passed.");
