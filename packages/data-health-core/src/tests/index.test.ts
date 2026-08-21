import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  DATA_HEALTH_IMAGE_SOURCES,
  resolveDataHealthExecutionContext,
} from "../index";
import {
  DATA_HEALTH_POLICY,
  cleanupConfirmationText,
  makeIssue,
} from "../server";

const manifest = JSON.parse(
  readFileSync(path.join(process.cwd(), "packages/data-health-core/package.json"), "utf8"),
) as { exports: Record<string, unknown> };
assert.deepEqual(Object.keys(manifest.exports), [".", "./server"]);

assert.deepEqual(resolveDataHealthExecutionContext(true), {
  environment: "development",
  runtime: "development-local",
  databaseSource: "sqlite",
  storageSource: "local",
  schemaComparisonAllowed: true,
});
assert.equal(resolveDataHealthExecutionContext(false).databaseSource, "turso");
assert.equal(DATA_HEALTH_POLICY.maxCleanupItems, 250);
assert.equal(cleanupConfirmationText("production", 3), "تنظيف 3 عنصر في الإنتاج");
assert.ok(DATA_HEALTH_IMAGE_SOURCES.some((source) => source.table === "products"));

const issue = makeIssue({
  category: "product",
  severity: "warning",
  database: "product",
  table: "products",
  recordId: "p1",
  ownerUid: "u1",
  title: "orphan",
  details: "orphan product",
  evidence: { value: 1 },
  cleanupAction: "archive-product",
  cleanupMode: "automatic",
});
assert.equal(issue.canClean, true);
assert.equal(issue.id, issue.fingerprint);
assert.equal(issue.id.length, 64);

for (const file of ["domain/types.ts", "domain/source-registry.ts", "domain/execution-context.ts", "index.ts"]) {
  const text = readFileSync(path.join(process.cwd(), "packages/data-health-core/src", file), "utf8");
  assert.doesNotMatch(text, /(?:node:|server-only|@\/|@asol\/)/, `${file} must stay browser-safe`);
}

console.log("@asol/data-health-core contract: 2 doors, explicit runtime input, cleanup policy pinned.");
