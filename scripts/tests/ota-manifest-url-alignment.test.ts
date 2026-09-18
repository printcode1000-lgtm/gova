import assert from "node:assert/strict";
import {
  assertOtaClientManifestUrlAligned,
  getOtaManifestUrl,
} from "@asol/ota-core/publishing";

const original = { ...process.env };
try {
  process.env.ASOL_OTA_R2_PUBLIC_URL = "https://pub-current.r2.dev";
  process.env.ASOL_OTA_R2_PREFIX = "app-updates";
  process.env.NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL = getOtaManifestUrl();
  assert.doesNotThrow(() => assertOtaClientManifestUrlAligned());

  process.env.NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL =
    "https://pub-stale.r2.dev/app-updates/manifest.json";
  assert.throws(
    () => assertOtaClientManifestUrlAligned(),
    /must match the OTA publisher destination/,
  );
  console.log("ota manifest URL alignment: ok");
} finally {
  process.env = original;
}
