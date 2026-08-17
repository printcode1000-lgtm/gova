import assert from "node:assert/strict";
import {
  androidVersionCodeFor,
  androidVersionNameFromCode,
  nextNativePatchVersion,
} from "../domain/versioning/native-version";
import {
  planAndroidNativeTarget,
  planAndroidNativeVersion,
  planOtaTargetVersion,
  reconcileOtaTargetWithR2,
} from "../domain/versioning/platform-version-truth";

export function runPlatformVersionTruthTests(): void {
  assert.equal(androidVersionCodeFor("0.2.2"), 202);
  assert.equal(androidVersionNameFromCode(202), "0.2.2");
  assert.equal(androidVersionNameFromCode(203), "0.2.3");

  assert.equal(
    planAndroidNativeTarget("0.2.2", "next-patch", true),
    "0.2.3",
  );
  assert.equal(
    planAndroidNativeTarget("0.2.2", "next-patch", true),
    planAndroidNativeTarget("0.2.2", "next-patch", true),
  );
  assert.throws(() => planAndroidNativeTarget("0.2.2", "current", true));

  const corrected = planAndroidNativeVersion("0.2.2", "next-patch", true, "0.2.6");
  assert.equal(corrected.targetVersion, "0.2.3");
  assert.equal(corrected.correctedFromLocal, "0.2.6");

  assert.equal(planOtaTargetVersion("0.2.3.2", "0.2.3"), "0.2.3.3");
  assert.equal(
    reconcileOtaTargetWithR2("0.2.3.2", "0.2.3", "0.2.3.8").target,
    "0.2.3.3",
  );
  assert.equal(
    reconcileOtaTargetWithR2("0.2.3.2", "0.2.3", "0.2.3.8").correctedFromLocal,
    "0.2.3.8",
  );
  assert.equal(
    reconcileOtaTargetWithR2("0.2.3.4", "0.2.3", "0.2.3.5").target,
    "0.2.3.5",
  );

  assert.equal(nextNativePatchVersion("0.2.2"), "0.2.3");
  console.log("  ✔ platform-version-truth unit tests passed");
}

if (process.argv[1]?.endsWith("platform-version-truth.test.ts")) {
  runPlatformVersionTruthTests();
}
