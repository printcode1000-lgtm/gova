import assert from "node:assert/strict";
import {
  evaluateReleaseGate,
  formatNativeSurfaceReport,
  isNativeSurface,
  NATIVE_SURFACE_PATTERNS,
} from "../publishing";

export async function runGateIntegrationTests(): Promise<void> {
  for (const file of [
    "android/app/src/main/AndroidManifest.xml",
    "android/app/build.gradle",
    "ios/App/App/Info.plist",
    "capacitor.config.ts",
  ]) {
    assert.equal(
      NATIVE_SURFACE_PATTERNS.some((pattern) => pattern.test(file)),
      true,
      `Native surface was not detected: ${file}`,
    );
    assert.equal(
      isNativeSurface(file, () => "content"),
      true,
    );
  }

  assert.equal(
    isNativeSurface("assets/icon.png", () => "content"),
    false,
  );

  const decision = await evaluateReleaseGate();
  assert.ok(decision.ok);
  assert.ok(["open", "blocked", "unprovable"].includes(decision.value.state));

  const report = formatNativeSurfaceReport(decision.value);
  assert.ok(typeof report === "string");
  assert.ok(report.length > 0);

  console.log("  ✔ gate integration tests passed");
}

if (process.argv[1]?.endsWith("gate.test.ts")) {
  runGateIntegrationTests().catch((e) => { console.error(e); process.exit(1); });
}
