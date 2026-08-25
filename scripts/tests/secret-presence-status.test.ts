import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  assertReportContainsNoValues,
  buildSecretPresenceReport,
  classifyEnvValue,
  classifyFileExists,
} from "../secret-presence-status";

assert.equal(classifyEnvValue(undefined), "missing");
assert.equal(classifyEnvValue(""), "empty");
assert.equal(classifyEnvValue("   "), "empty");
assert.equal(classifyEnvValue("not-printed"), "present");
assert.equal(classifyFileExists(true), "file-present");
assert.equal(classifyFileExists(false), "file-missing");

const fixture = mkdtempSync(path.join(tmpdir(), "asol-secret-presence-"));
mkdirSync(path.join(fixture, "config"), { recursive: true });
writeFileSync(
  path.join(fixture, "config", "secret-backup-paths.json"),
  JSON.stringify({ exactPaths: [".env", "fastlane/play-store-key.json"] }),
  "utf8",
);
writeFileSync(path.join(fixture, ".env"), "VERCEL_TOKEN=super-secret-token-value\n", "utf8");

const env: NodeJS.ProcessEnv = {
  VERCEL_TOKEN: "super-secret-token-value",
  ASOL_OTA_R2_BUCKET_NAME: "",
};
const rows = buildSecretPresenceReport({ cwd: fixture, env });
const byEnv = Object.fromEntries(
  rows.filter((row) => row.kind === "env").map((row) => [row.name, row.status]),
);
const files = rows.filter((row) => row.kind === "file");

assert.equal(byEnv.VERCEL_TOKEN, "present");
assert.equal(byEnv.ASOL_OTA_R2_BUCKET_NAME, "empty");
assert.equal(byEnv.ASOL_OTA_R2_ACCESS_KEY_ID, "missing");
assert.equal(
  files.some((row) => row.path === ".env" && row.status === "file-present"),
  true,
);
assert.equal(
  files.some((row) => row.path === "fastlane/play-store-key.json" && row.status === "file-missing"),
  true,
);
assert.equal(
  JSON.stringify(rows).includes("super-secret-token-value"),
  false,
  "Presence rows must never contain secret values.",
);
assertReportContainsNoValues(rows, env);

console.log("Secret presence reporter: statuses only; values never leak.");
