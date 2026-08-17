import assert from "node:assert/strict";
import * as runtime from "../index";
import * as publishing from "../publishing";

export async function runPublishingExportsTests(): Promise<void> {
  // Runtime API
  assert.equal(typeof runtime.compareOtaVersions, "function");
  assert.equal(typeof runtime.isOtaVersion, "function");
  assert.equal(typeof runtime.isNativeVersion, "function");
  assert.equal(typeof runtime.parseContentVersion, "function");
  assert.equal(typeof runtime.nextContentVersion, "function");
  assert.equal(typeof runtime.releaseContentVersion, "function");
  assert.equal(typeof runtime.evaluateOtaCapabilities, "function");
  assert.equal(typeof runtime.otaApiService, "object");
  assert.equal(typeof runtime.otaRevocationService, "object");
  assert.equal(typeof runtime.otaUpdateService, "object");
  assert.equal(typeof runtime.useOtaUpdate, "function");
  assert.equal(typeof runtime.OtaUpdateProvider, "function");

  // Publishing API
  assert.equal(typeof publishing.evaluateReleaseGate, "function");
  assert.equal(typeof publishing.formatNativeSurfaceReport, "function");
  assert.equal(typeof publishing.buildStaticOut, "function");
  assert.equal(typeof publishing.publishOtaRelease, "function");
  assert.equal(typeof publishing.cutNativeRelease, "function");
  assert.equal(typeof publishing.runLocalRefresh, "function");
  assert.equal(typeof publishing.revokeOtaVersion, "function");
  assert.equal(typeof publishing.readLiveOtaRelease, "function");
  assert.equal(typeof publishing.readLivePlayRelease, "function");
  assert.equal(typeof publishing.readCurrentVersions, "function");
  assert.equal(typeof publishing.writeTreeVersions, "function");
  assert.equal(typeof publishing.generateOtaSigningKeys, "function");
  assert.equal(typeof publishing.assertReleaseManifestNotDowngraded, "function");
  assert.equal(typeof publishing.resolveGooglePlayCredentials, "function");
  assert.equal(typeof publishing.requireGooglePlayProductionNativeVersion, "function");
  assert.equal(typeof publishing.requireIosProductionNativeVersion, "function");
  assert.equal(typeof publishing.androidVersionNameFromCode, "function");
  assert.equal(typeof publishing.planAndroidNativeVersion, "function");
  assert.equal(typeof publishing.syncAndroidProjectVersions, "function");

  console.log("  ✔ publishing-exports contract tests passed");
}

if (process.argv[1]?.endsWith("publishing-exports.test.ts")) {
  runPublishingExportsTests().catch((e) => { console.error(e); process.exit(1); });
}
