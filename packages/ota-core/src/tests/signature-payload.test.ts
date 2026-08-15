import assert from "node:assert/strict";
import {
  canonicalOtaManifestPayload,
  legacyOtaManifestPayload,
} from "../domain/release/signature-payload";
import type { OtaManifestPayload } from "../domain/release/manifest-types";

export async function runSignaturePayloadTests(): Promise<void> {
  const payload: OtaManifestPayload = {
    schemaVersion: 2,
    delivery: "files",
    releaseId: "test-rel-1",
    version: "0.2.4.1",
    createdAt: "2026-08-15T00:00:00.000Z",
    baseUrl: "https://example.com/app-updates/files",
    size: 100,
    fileCount: 1,
    minimumNativeVersion: "0.2.4",
    requiredCapabilities: ["camera.photo"],
    mandatory: false,
    notes: "Release 0.2.4.1",
    files: {
      "index.html": { sha256: "a".repeat(64), size: 100 },
    },
  };

  const canonical = canonicalOtaManifestPayload(payload);
  assert.ok(typeof canonical === "string");
  assert.ok(canonical.includes('"schemaVersion":2'));
  assert.ok(canonical.includes('"releaseId":"test-rel-1"'));

  assert.equal(legacyOtaManifestPayload(payload), null);

  const legacyPayload: any = {
    schemaVersion: 2,
    delivery: "files" as const,
    releaseId: "test-rel-legacy",
    version: "0.2.4.0",
    createdAt: "2026-08-15T00:00:00.000Z",
    baseUrl: "https://example.com/app-updates/files",
    size: 100,
    fileCount: 1,
    minimumNativeVersion: "0.2.4",
    mandatory: false,
    notes: "Legacy release",
    files: {
      "index.html": { sha256: "a".repeat(64), size: 100 },
    },
  };
  const legacy = legacyOtaManifestPayload(legacyPayload);
  assert.ok(typeof legacy === "string");

  console.log("  ✔ signature-payload unit tests passed");
}

if (process.argv[1]?.endsWith("signature-payload.test.ts")) {
  runSignaturePayloadTests().catch((e) => { console.error(e); process.exit(1); });
}
