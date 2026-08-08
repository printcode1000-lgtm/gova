import assert from "node:assert/strict";

import {
  NATIVE_CONTRACT_FILES,
  NATIVE_SURFACE_PATTERNS,
  inspectNativeCompatibility,
  isNativeSurface,
  resolveNativeBaseline,
} from "./ota/ota-native-compatibility";
import {
  assertDetectionCoverage,
  detectableCapabilityKeys,
} from "./ota/ota-capability-scan";
import { ALL_CAPABILITY_KEYS } from "../src/native-platform/capabilities/capability-keys";

/**
 * The golden rule, as executable checks.
 *
 * OTA ships UI and logic that run inside the native capabilities already on
 * the device. Any new device capability is a store release. These tests guard
 * the classifier that decides which side of that line a change falls on.
 */

const NATIVE_IMPORTING_FILE = `import { Camera } from "@capacitor/camera";\nexport const x = Camera;\n`;
const DYNAMIC_IMPORTING_FILE = `export const load = async () => await import("@capacitor/core");\n`;
const PURE_WEB_FILE = `export interface CameraImage { file: File }\n`;

function classify(file: string, content: string | null = PURE_WEB_FILE) {
  return isNativeSurface(file, () => content);
}

// ---------------------------------------------------------------------------
// Native surfaces outside src/ are recognised by path alone
// ---------------------------------------------------------------------------
for (const file of [
  "android/app/src/main/AndroidManifest.xml",
  "android/app/build.gradle",
  "ios/App/App/Info.plist",
  "ios/ShareExtension/ShareViewController.swift",
  "capacitor.config.ts",
]) {
  assert.equal(
    NATIVE_SURFACE_PATTERNS.some((pattern) => pattern.test(file)),
    true,
    `Native surface was not detected: ${file}`,
  );
  assert.equal(classify(file), true, `Native surface was not detected: ${file}`);
}

// ---------------------------------------------------------------------------
// Paths that look native but never reach the store binary
// ---------------------------------------------------------------------------
// These were classified native by path. One release flagged six files of which
// five were harmless, and the publisher answered by declaring a minimum native
// version five times without re-reading the list. A gate that cries wolf stops
// being read, so each of these must stay quiet unless its content says
// otherwise.
for (const file of [
  "fastlane/Fastfile",
  "fastlane/Appfile",
  "assets/google-play/icon.png",
  "assets/icon.png",
]) {
  assert.equal(
    classify(file),
    false,
    `${file} is not compiled into the store binary and must not force a store release.`,
  );
}

// `platform/` is build-time configuration: capacitor.config.ts does not import
// it, and its values are baked into the web bundle, so it travels over OTA.
assert.equal(
  classify("platform/capacitor.defaults.ts", "export const CAPACITOR_API_BASE_URL = 'https://x';\n"),
  false,
  "A build-time constant under platform/ must not force a store release.",
);

// …but the same folder is native the moment its content binds to a plugin.
assert.equal(
  classify("platform/some-native-shim.ts", NATIVE_IMPORTING_FILE),
  true,
  "A plugin import under platform/ is a native binding wherever it sits.",
);

// ---------------------------------------------------------------------------
// Inside src/, a file is native because it binds to a plugin — wherever it sits
// ---------------------------------------------------------------------------
for (const file of [
  "src/native-platform/camera/camera-native-adapter.ts",
  // The sanctioned Capacitor-import exceptions live outside src/native-platform
  // and were invisible to the path-only classifier.
  "src/platform/ota/capacitor-ota-adapter.ts",
  "src/platform/navigation/capacitor-back-button-adapter.ts",
  "src/features/ota/services/ota-api-service.ts",
  "src/features/page-snapshot/hooks/use-page-snapshot.tsx",
]) {
  assert.equal(
    classify(file, NATIVE_IMPORTING_FILE),
    true,
    `A plugin binding was not detected as native: ${file}`,
  );
}

assert.equal(
  classify("src/native-platform/capabilities/capability-registry.ts", DYNAMIC_IMPORTING_FILE),
  true,
  "A dynamic plugin import must count as a native binding",
);

// ---------------------------------------------------------------------------
// Declared native contracts are native even without a plugin import
// ---------------------------------------------------------------------------
for (const [file, reason] of NATIVE_CONTRACT_FILES) {
  assert.ok(reason.length > 0, `Native contract file needs a reason: ${file}`);
  assert.equal(
    classify(file, PURE_WEB_FILE),
    true,
    `Declared native contract was not detected: ${file}`,
  );
}

// ---------------------------------------------------------------------------
// Pure web changes must NOT trip the gate
// ---------------------------------------------------------------------------
for (const file of [
  "src/components/profile/ProfilePreviewContent.tsx",
  "src/features/notifications/application/notification-sender.ts",
  "src/locales/ar.json",
  "docs/07-mobile-and-release/capacitor/native-platform.md",
  "package-lock.json",
  "src/app/profile/page.tsx",
  "src/features/native-platform-notes.ts",
  // Pure TypeScript inside the Native Platform layer ships in the web bundle
  // and must remain OTA-deliverable: a facade, a web adapter, a validator.
  "src/native-platform/camera/camera.ts",
  "src/native-platform/camera/camera-web-adapter.ts",
  "src/native-platform/share/share-validator.ts",
  "src/native-platform/share/share-queue.ts",
  "src/native-platform/barcode/duplicate-filter.ts",
  "src/native-platform/core/errors.ts",
]) {
  assert.equal(
    classify(file),
    false,
    `A web-only change was misclassified as native: ${file}`,
  );
}

// Tests never reach a device.
assert.equal(
  classify("src/native-platform/tests/native-platform-contract.test.ts", NATIVE_IMPORTING_FILE),
  false,
  "Test sources must not trip the gate",
);

// ---------------------------------------------------------------------------
// A deleted binding is classified from the baseline copy, not silently dropped
// ---------------------------------------------------------------------------
assert.equal(
  isNativeSurface(
    "src/native-platform/camera/camera-native-adapter.ts",
    () => null,
    () => NATIVE_IMPORTING_FILE,
  ),
  true,
  "Deleting a plugin binding must still be treated as a native change",
);

// ---------------------------------------------------------------------------
// A missing baseline fails closed: nothing can be proven compatible
// ---------------------------------------------------------------------------
{
  const report = inspectNativeCompatibility("");
  assert.equal(report.baselineMissing, true);
  assert.equal(
    report.requiresStoreRelease,
    true,
    "Without a baseline the gate must fail closed",
  );
  assert.deepEqual(report.changedPaths, []);
}

// ---------------------------------------------------------------------------
// The baseline resolver honours an explicit override
// ---------------------------------------------------------------------------
{
  const original = process.env.ASOL_OTA_NATIVE_BASELINE;
  process.env.ASOL_OTA_NATIVE_BASELINE = "abc1234";
  assert.equal(resolveNativeBaseline(), "abc1234");
  if (original === undefined) delete process.env.ASOL_OTA_NATIVE_BASELINE;
  else process.env.ASOL_OTA_NATIVE_BASELINE = original;
}

// ---------------------------------------------------------------------------
// Against a real commit, the classifier returns a coherent report
// ---------------------------------------------------------------------------
{
  const report = inspectNativeCompatibility("HEAD");
  assert.equal(report.baselineMissing, false);
  assert.equal(Array.isArray(report.changedPaths), true);
  assert.equal(Array.isArray(report.changedNativeDependencies), true);
  // HEAD against a clean working tree carries no native dependency drift.
  assert.deepEqual(report.changedNativeDependencies, []);
}

// ---------------------------------------------------------------------------
// Every declared capability must be detectable from source
// ---------------------------------------------------------------------------
{
  assertDetectionCoverage();
  assert.deepEqual(
    detectableCapabilityKeys(),
    [...ALL_CAPABILITY_KEYS].sort(),
    "Every capability key needs a detection pattern, and patterns must not invent keys",
  );
}

console.log("OTA native compatibility tests passed.");
