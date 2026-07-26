import assert from "node:assert/strict";

import {
  cleanupConfirmationText,
  isOlderThan,
  makeIssue,
  stableHash,
} from "../domain/policy";
import { DATA_HEALTH_METADATA_STATEMENTS } from "../db/metadata-schema";

const base = {
  category: "image" as const,
  severity: "warning" as const,
  database: "storage",
  table: "objects",
  recordId: "images/products/example.webp",
  ownerUid: "",
  title: "orphan",
  details: "orphan image",
  evidence: { imageKey: "example.webp" },
  cleanupAction: "quarantine-storage-object" as const,
  cleanupMode: "quarantine" as const,
};

const first = makeIssue(base);
const second = makeIssue({ ...base, title: "translated title" });
assert.equal(first.fingerprint, second.fingerprint);
assert.equal(first.snapshotHash, second.snapshotHash);
assert.equal(first.canClean, true);

const protectedIssue = makeIssue({
  ...base,
  cleanupAction: "none",
  cleanupMode: "protected",
});
assert.equal(protectedIssue.canClean, false);

assert.equal(cleanupConfirmationText("development", 3), "تنظيف 3 عنصر");
assert.equal(
  cleanupConfirmationText("production", 3),
  "تنظيف 3 عنصر في الإنتاج",
);
assert.equal(
  isOlderThan("2026-01-01T00:00:00.000Z", 90, Date.parse("2026-07-01")),
  true,
);
assert.equal(
  isOlderThan("2026-06-30T00:00:00.000Z", 90, Date.parse("2026-07-01")),
  false,
);
assert.equal(stableHash({ a: 1 }), stableHash({ a: 1 }));

assert.ok(DATA_HEALTH_METADATA_STATEMENTS.length >= 10);
assert.ok(
  DATA_HEALTH_METADATA_STATEMENTS.every((statement) =>
    /CREATE (TABLE|INDEX) IF NOT EXISTS/i.test(statement),
  ),
);

console.log("Data health policy and metadata contracts passed.");

