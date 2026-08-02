/** Single responsibility: verify capability gating, delta planning, resume, and bounded work. */
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { scanBuiltCapabilities } from "../../../../scripts/ota/ota-capability-scan";
import { evaluateOtaCapabilities } from "../utils/ota-capability-gate";
import {
  pendingDeltaFiles,
  planOtaDelta,
  runBounded,
} from "../utils/ota-delta-plan";
import type { OtaManifest } from "../types/ota.types";

function manifest(version: string, files: OtaManifest["files"]): OtaManifest {
  return {
    schemaVersion: 2,
    delivery: "files",
    releaseId: version,
    version,
    createdAt: new Date(0).toISOString(),
    baseUrl: "https://example.com",
    size: Object.values(files).reduce((sum, file) => sum + file.size, 0),
    fileCount: Object.keys(files).length,
    minimumNativeVersion: "0.2.0",
    requiredCapabilities: [],
    mandatory: false,
    notes: "test",
    files,
    signature: "test",
  };
}

async function main(): Promise<void> {
  const local = manifest("1.0.0", {
    "same.js": { sha256: "a".repeat(64), size: 10 },
    "old.js": { sha256: "b".repeat(64), size: 20 },
  });
  const remote = manifest("1.0.1", {
    "same.js": { sha256: "a".repeat(64), size: 10 },
    "new.js": { sha256: "c".repeat(64), size: 30 },
  });
  const plan = planOtaDelta(local, remote);
  assert.deepEqual(plan, {
    changed: ["new.js"],
    deleted: ["old.js"],
    downloadBytes: 30,
  });
  assert.deepEqual(
    pendingDeltaFiles(plan, remote, {
      releaseId: remote.releaseId,
      version: remote.version,
      completed: { "new.js": "c".repeat(64) },
    }),
    [],
  );
  assert.deepEqual(
    pendingDeltaFiles(plan, remote, {
      releaseId: "stale",
      version: remote.version,
      completed: { "new.js": "c".repeat(64) },
    }),
    ["new.js"],
  );

  const gate = await evaluateOtaCapabilities(
    ["barcode.scan", "network.status"],
    { missing: async () => ["network.status"] },
  );
  assert.deepEqual(gate, {
    compatible: false,
    missingCapabilities: ["network.status"],
  });
  assert.deepEqual(
    scanBuiltCapabilities({
      "asol-required-capabilities.json": {
        bytes: Buffer.from('["network.status","barcode.scan"]'),
      },
    }),
    ["barcode.scan", "network.status"],
  );
  assert.throws(
    () => scanBuiltCapabilities({}),
    /Missing asol-required-capabilities\.json; run npm run build:static/,
  );
  assert.throws(
    () =>
      scanBuiltCapabilities({
        "asol-required-capabilities.json": {
          bytes: Buffer.from('["unknown.capability"]'),
        },
      }),
    /Invalid asol-required-capabilities\.json; run npm run build:static/,
  );

  let active = 0;
  let maximum = 0;
  await runBounded(
    Array.from({ length: 24 }, (_, index) => index),
    6,
    async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
    },
  );
  assert.equal(maximum, 6);
  console.log("OTA delivery tests passed.");
}
void main();
