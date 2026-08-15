import assert from "node:assert/strict";
import {
  safeBundlePath,
  selectOtaBundle,
  bundleUrl,
} from "../domain/release/bundle";
import type { OtaManifest } from "../domain/release/manifest-types";

export async function runBundleTests(): Promise<void> {
  assert.equal(safeBundlePath("bundles/1.0.0/full.zip"), "bundles/1.0.0/full.zip");
  assert.throws(() => safeBundlePath("../escape.zip"));
  assert.throws(() => safeBundlePath("a/../b.zip"));
  assert.throws(() => safeBundlePath("evil\0.zip"));

  const manifest: OtaManifest = {
    schemaVersion: 2,
    delivery: "files",
    releaseId: "rel-1",
    version: "0.2.4.2",
    createdAt: new Date().toISOString(),
    baseUrl: "https://example.com/app-updates/files",
    size: 500,
    fileCount: 2,
    minimumNativeVersion: "0.2.4",
    requiredCapabilities: [],
    mandatory: false,
    notes: "Test",
    files: {},
    bundles: {
      full: { path: "bundles/rel-1/full.zip", sha256: "f".repeat(64), size: 500 },
      deltas: [
        { path: "bundles/rel-1/from-0.2.4.1.zip", fromVersion: "0.2.4.1", sha256: "d".repeat(64), size: 100 },
      ],
    },
  };

  const deltaChoice = selectOtaBundle(manifest, "0.2.4.1");
  assert.equal(deltaChoice?.kind, "delta");
  assert.equal(deltaChoice?.entry.path, "bundles/rel-1/from-0.2.4.1.zip");

  const fullChoice = selectOtaBundle(manifest, "0.2.3.0");
  assert.equal(fullChoice?.kind, "full");
  assert.equal(fullChoice?.entry.path, "bundles/rel-1/full.zip");

  const url = bundleUrl(manifest, manifest.bundles!.full);
  assert.equal(url, "https://example.com/app-updates/bundles/rel-1/full.zip");

  console.log("  ✔ bundle unit tests passed");
}

if (process.argv[1]?.endsWith("bundle.test.ts")) {
  runBundleTests().catch((e) => { console.error(e); process.exit(1); });
}
