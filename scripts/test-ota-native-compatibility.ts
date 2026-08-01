import assert from "node:assert/strict";

import {
  NATIVE_SURFACE_PATTERNS,
  inspectNativeCompatibility,
  resolveNativeBaseline,
} from "./ota/ota-native-compatibility";

/**
 * The golden rule, as executable checks.
 *
 * OTA ships UI and logic that run inside the native capabilities already on
 * the device. Any new device capability is a store release. These tests guard
 * the classifier that decides which side of that line a change falls on.
 */

function matchesNativeSurface(file: string): boolean {
  return NATIVE_SURFACE_PATTERNS.some((pattern) => pattern.test(file));
}

// ---------------------------------------------------------------------------
// Native surfaces must be recognised
// ---------------------------------------------------------------------------
for (const file of [
  "android/app/src/main/AndroidManifest.xml",
  "android/app/build.gradle",
  "ios/App/App/Info.plist",
  "ios/ShareExtension/ShareViewController.swift",
  "capacitor.config.ts",
  "platform/capacitor.defaults.ts",
  "assets/google-play/icon.png",
  "fastlane/Fastfile",
  "src/native-platform/camera/camera.ts",
  "src/native-platform/index.ts",
]) {
  assert.equal(
    matchesNativeSurface(file),
    true,
    `Native surface was not detected: ${file}`,
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
  // A file merely mentioning the layer in its path segment must not match.
  "src/features/native-platform-notes.ts",
]) {
  assert.equal(
    matchesNativeSurface(file),
    false,
    `A web-only change was misclassified as native: ${file}`,
  );
}

// ---------------------------------------------------------------------------
// A missing baseline is reported, never silently treated as compatible
// ---------------------------------------------------------------------------
{
  const report = inspectNativeCompatibility("");
  assert.equal(report.requiresStoreRelease, false);
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
  // HEAD against HEAD is an empty diff.
  assert.deepEqual(report.changedPaths, []);
  assert.deepEqual(report.changedNativeDependencies, []);
  assert.equal(report.requiresStoreRelease, false);
}

console.log("OTA native compatibility tests passed.");
