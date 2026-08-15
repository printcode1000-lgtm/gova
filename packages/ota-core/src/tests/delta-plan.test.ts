import assert from "node:assert/strict";
import { planOtaDelta, pendingDeltaFiles } from "../domain/release/delta-plan";
import type { OtaManifest } from "../domain/release/manifest-types";

export async function runDeltaPlanTests(): Promise<void> {
  const local: OtaManifest = {
    schemaVersion: 2,
    delivery: "files",
    releaseId: "rel-local",
    version: "0.2.4.0",
    createdAt: new Date().toISOString(),
    baseUrl: "https://example.com/app-updates/files",
    size: 200,
    fileCount: 2,
    minimumNativeVersion: "0.2.4",
    requiredCapabilities: [],
    mandatory: false,
    notes: "",
    files: {
      "index.html": { sha256: "1".repeat(64), size: 100 },
      "old.js": { sha256: "2".repeat(64), size: 100 },
    },
  };

  const remote: OtaManifest = {
    schemaVersion: 2,
    delivery: "files",
    releaseId: "rel-remote",
    version: "0.2.4.1",
    createdAt: new Date().toISOString(),
    baseUrl: "https://example.com/app-updates/files",
    size: 250,
    fileCount: 2,
    minimumNativeVersion: "0.2.4",
    requiredCapabilities: [],
    mandatory: false,
    notes: "",
    files: {
      "index.html": { sha256: "1".repeat(64), size: 100 }, // Unchanged
      "new.js": { sha256: "3".repeat(64), size: 150 }, // Added
    },
  };

  const diff = planOtaDelta(local, remote);
  assert.deepEqual(diff.changed, ["new.js"]);
  assert.deepEqual(diff.deleted, ["old.js"]);
  assert.equal(diff.downloadBytes, 150);

  const pending = pendingDeltaFiles(diff, remote, {
    releaseId: "rel-remote",
    version: "0.2.4.1",
    completed: { "new.js": "3".repeat(64) },
  });
  assert.deepEqual(pending, []);

  console.log("  ✔ delta-plan unit tests passed");
}

if (process.argv[1]?.endsWith("delta-plan.test.ts")) {
  runDeltaPlanTests().catch((e) => { console.error(e); process.exit(1); });
}
