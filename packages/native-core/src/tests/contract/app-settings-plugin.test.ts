/**
 * Contract test: the AppSettings plugin's notification-settings route.
 *
 * The native halves cannot run here, so their sources are asserted instead:
 * what matters is that each platform uses its officially supported API and
 * still has a fallback when that destination is unavailable.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NativeCore } from "../../index";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function nativeSource(relativePath: string): string {
  return readFileSync(path.join(packageRoot, relativePath), "utf8");
}

const android = nativeSource(
  "android/src/main/java/hgh/asol/app/AppSettingsPlugin.java",
);
const ios = nativeSource("ios/Sources/AsolNativeCore/AppSettingsPlugin.swift");

// Android: the official app-notification destination, with the app details
// screen as the fallback for pre-O and for OEM builds that do not answer it.
assert.match(android, /public void openNotifications\(PluginCall call\)/);
assert.match(android, /Settings\.ACTION_APP_NOTIFICATION_SETTINGS/);
assert.match(android, /Settings\.EXTRA_APP_PACKAGE/);
assert.match(android, /Build\.VERSION_CODES\.O/);
assert.match(android, /Settings\.ACTION_APPLICATION_DETAILS_SETTINGS/);
assert.match(android, /catch \(ActivityNotFoundException/);
// The pre-existing entry point keeps its behaviour.
assert.match(android, /public void open\(PluginCall call\)/);

// iOS: the notification settings URL where the OS version has one, the app's
// own settings page otherwise.
assert.match(ios, /jsName = "AppSettings"/);
assert.match(ios, /CAPPluginMethod\(name: "openNotifications"/);
assert.match(ios, /UIApplication\.openNotificationSettingsURLString/);
assert.match(ios, /#available\(iOS 16\.0, \*\)/);
assert.match(ios, /UIApplicationOpenNotificationSettingsURLString/);
assert.match(ios, /#available\(iOS 15\.4, \*\)/);
assert.match(ios, /UIApplication\.openSettingsURLString/);

// The public surface exists and degrades on a host with no native shell.
assert.equal(typeof NativeCore.openAppNotificationSettings, "function");
assert.equal(typeof NativeCore.canOpenAppNotificationSettings, "function");
assert.equal(NativeCore.canOpenAppNotificationSettings(), false);

const result = await NativeCore.openAppNotificationSettings();
assert.equal(result.ok, true);
assert.equal(result.ok && result.value, false);

console.log("AppSettings plugin contract tests passed.");
