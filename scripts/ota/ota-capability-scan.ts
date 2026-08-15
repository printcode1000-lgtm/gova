/**
 * Single responsibility: read and validate the capability requirements emitted
 * by the static build.
 */

import type { Buffer } from "node:buffer";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  ALL_CAPABILITY_KEYS,
  CapabilityKeys,
  type CapabilityKey,
  CAPABILITY_AVAILABILITY,
  OPTIONAL_CAPABILITIES_MINIMUM_NATIVE_VERSION,
  PLATFORM_OPTIONAL_SHELL_CAPABILITIES,
  type CapabilityAvailability,
} from "@asol/native-core";
import { compareOtaVersions } from "../../src/features/ota/utils/ota-state";

export interface ScannableBuiltFile {
  bytes: Buffer;
}

export const CAPABILITY_METADATA_FILE = "asol-required-capabilities.json";

export interface CapabilityRequirements {
  /** Needed on every platform; a device missing one skips the release. */
  required: string[];
  /** Needed on some platforms only; never blocks a release. */
  optional: string[];
}

/**
 * Split detected capabilities by whether every native shell provides them.
 *
 * The split is derived from `SHELL_CAPABILITIES_BY_PLATFORM`, not from a
 * separate hand-kept list, so it cannot disagree with what the shells actually
 * contain. A capability that only one platform has is optional by construction.
 */
export function splitCapabilityRequirements(
  detected: readonly string[],
): CapabilityRequirements {
  const optionalKeys = new Set<string>(PLATFORM_OPTIONAL_SHELL_CAPABILITIES);
  const unique = [...new Set(detected)].sort();
  return {
    required: unique.filter((key) => !optionalKeys.has(key)),
    optional: unique.filter((key) => optionalKeys.has(key)),
  };
}

/**
 * Decide whether this release may carry `optionalCapabilities` at all.
 *
 * The field is inside the signed payload, so a client built before it existed
 * computes a different canonical string and rejects the manifest outright. A
 * device that rejects every release can only be recovered from the store, so
 * the publisher withholds the field until `minimumNativeVersion` guarantees a
 * client that understands it. Optional keys gate nothing, so withholding them
 * changes no device behaviour.
 */
export function resolveOptionalCapabilities(
  minimumNativeVersion: string,
  detected: readonly string[],
): { optional: string[]; withheld: string[] } {
  const supported =
    compareOtaVersions(
      minimumNativeVersion,
      OPTIONAL_CAPABILITIES_MINIMUM_NATIVE_VERSION,
    ) >= 0;
  return supported
    ? { optional: [...detected], withheld: [] }
    : { optional: [], withheld: [...detected] };
}

export interface ResolvedManifestCapabilities {
  required: string[];
  optional: string[];
  /** Keys dropped because the targeted clients cannot name them. */
  withheldUnnamed: string[];
  /** Keys dropped because the targeted clients predate `optionalCapabilities`. */
  withheldOptional: string[];
}

/**
 * Reduce the detected capabilities to what the targeted clients can actually
 * act on.
 *
 * A shipped client answers `false` for any key outside its own vocabulary, so
 * naming a newer key does not make an old device cautious — it makes it refuse
 * every release permanently. Three cases, decided per key:
 *
 * | Targeted `minimumNativeVersion` vs the key | Result |
 * | --- | --- |
 * | at/above `vocabularySince` | listed normally |
 * | below `vocabularySince`, at/above `backedSince` | withheld — every targeted shell has the plugin, so nothing is left unguarded |
 * | below `backedSince` | **throws** — some targeted shell genuinely lacks the plugin, and that is a store release |
 *
 * @throws When the release needs a capability a targeted shell cannot provide.
 */
export function resolveManifestCapabilities(
  minimumNativeVersion: string,
  detected: { required: readonly string[]; optional: readonly string[] },
): ResolvedManifestCapabilities {
  const availabilityOf = (key: string): CapabilityAvailability | undefined =>
    CAPABILITY_AVAILABILITY[key as CapabilityKey];

  const unbacked = [...detected.required, ...detected.optional].filter((key) => {
    const availability = availabilityOf(key);
    return (
      availability &&
      compareOtaVersions(minimumNativeVersion, availability.backedSince) < 0
    );
  });
  if (unbacked.length > 0) {
    throw new Error(
      "Refusing to publish: this bundle needs capabilities that shells at " +
        `minimumNativeVersion=${minimumNativeVersion} do not contain:\n` +
        unbacked
          .map(
            (key) =>
              `  - ${key} (backed since ${availabilityOf(key)?.backedSince})`,
          )
          .join("\n") +
        "\nPublish a store build and raise ASOL_OTA_MINIMUM_NATIVE_VERSION.",
    );
  }

  const named = (key: string): boolean => {
    const availability = availabilityOf(key);
    if (!availability) return true;
    return (
      compareOtaVersions(minimumNativeVersion, availability.vocabularySince) >= 0
    );
  };

  const required = detected.required.filter(named);
  const withheldUnnamed = [
    ...detected.required.filter((key) => !named(key)),
    ...detected.optional.filter((key) => !named(key)),
  ].sort();

  const { optional, withheld: withheldOptional } = resolveOptionalCapabilities(
    minimumNativeVersion,
    detected.optional.filter(named),
  );

  return { required, optional, withheldUnnamed, withheldOptional };
}

function assertKeys(keys: unknown, metadataFile: string): string[] {
  if (
    !Array.isArray(keys) ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        !ALL_CAPABILITY_KEYS.includes(key as CapabilityKey),
    )
  ) {
    throw new Error(
      `Invalid ${metadataFile}; run npm run build:static before checking or publishing an OTA release.`,
    );
  }
  return [...new Set(keys as string[])].sort();
}

export function scanBuiltCapabilities(
  files: Record<string, ScannableBuiltFile>,
): CapabilityRequirements {
  const metadataFile = CAPABILITY_METADATA_FILE;
  const generated = files[metadataFile];
  if (!generated) {
    throw new Error(
      `Missing ${metadataFile}; run npm run build:static before checking or publishing an OTA release.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(generated.bytes.toString("utf8"));
  } catch {
    throw new Error(
      `Invalid ${metadataFile}; run npm run build:static before checking or publishing an OTA release.`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      `Invalid ${metadataFile}; run npm run build:static before checking or publishing an OTA release.`,
    );
  }

  const record = parsed as { required?: unknown; optional?: unknown };
  return {
    required: assertKeys(record.required, metadataFile),
    optional: assertKeys(record.optional ?? [], metadataFile),
  };
}

/**
 * Source tokens that prove a bundle needs a capability.
 *
 * Every token must name a method that actually exists on NativeCore or domain vocabulary.
 * `assertDetectionCoverage` keeps the map honest by failing when a capability key
 * has no token at all.
 */
const apiPatterns = new Map<string, string>([
  // Unified facade NativeCore.*
  ["NativeCore.getAppState", CapabilityKeys.AppState],
  ["NativeCore.onAppStateChange", CapabilityKeys.AppState],
  ["NativeCore.getAppInfo", CapabilityKeys.AppInfo],
  ["NativeCore.onAppUrlOpen", CapabilityKeys.AppDeepLink],
  ["NativeCore.exitApp", CapabilityKeys.AppExit],
  ["NativeCore.minimizeApp", CapabilityKeys.AppExit],
  ["NativeCore.takePhoto", CapabilityKeys.CameraTakePhoto],
  ["NativeCore.pickImages", CapabilityKeys.CameraPickImages],
  ["NativeCore.getCurrentPosition", CapabilityKeys.LocationCurrent],
  ["NativeCore.watchPosition", CapabilityKeys.LocationWatch],
  ["NativeCore.clearWatch", CapabilityKeys.LocationWatch],
  ["NativeCore.startSpeechRecognition", CapabilityKeys.SpeechRecognize],
  ["NativeCore.stopSpeechRecognition", CapabilityKeys.SpeechRecognize],
  ["NativeCore.isSpeechRecognitionAvailable", CapabilityKeys.SpeechRecognize],
  ["NativeCore.pickFiles", CapabilityKeys.FilesPick],
  ["NativeCore.saveFile", CapabilityKeys.FilesSave],
  ["NativeCore.readFile", CapabilityKeys.FilesAppStorage],
  ["NativeCore.writeFile", CapabilityKeys.FilesAppStorage],
  ["NativeCore.deleteFile", CapabilityKeys.FilesAppStorage],
  ["NativeCore.openFileExternally", CapabilityKeys.FilesOpen],
  ["NativeCore.share", CapabilityKeys.ShareSend],
  ["NativeCore.canShare", CapabilityKeys.ShareSend],
  ["NativeCore.onShareReceived", CapabilityKeys.ShareReceive],
  ["NativeCore.getPendingShareItems", CapabilityKeys.ShareReceive],
  ["NativeCore.registerForPushNotifications", CapabilityKeys.NotificationsPush],
  ["NativeCore.onPushToken", CapabilityKeys.NotificationsPush],
  ["NativeCore.onPushNotificationReceived", CapabilityKeys.NotificationsPush],
  ["NativeCore.onPushNotificationActionPerformed", CapabilityKeys.NotificationsPush],
  ["NativeCore.getDeliveredNotifications", CapabilityKeys.NotificationsPush],
  ["NativeCore.removeDeliveredNotifications", CapabilityKeys.NotificationsPush],
  ["NativeCore.removeAllDeliveredNotifications", CapabilityKeys.NotificationsPush],
  ["NativeCore.listPendingInbox", CapabilityKeys.NotificationsPush],
  ["NativeCore.acknowledgeInbox", CapabilityKeys.NotificationsPush],
  ["NativeCore.clearInbox", CapabilityKeys.NotificationsPush],
  ["NativeCore.getPendingInboxCount", CapabilityKeys.NotificationsPush],
  ["NativeCore.getPendingInboxTap", CapabilityKeys.NotificationsPush],
  ["NativeCore.clearPendingInboxTap", CapabilityKeys.NotificationsPush],
  ["NativeCore.onInboxTap", CapabilityKeys.NotificationsPush],
  ["NativeCore.scheduleLocalNotification", CapabilityKeys.NotificationsLocal],
  ["NativeCore.scanBarcode", CapabilityKeys.BarcodeScan],
  ["NativeCore.openBrowser", CapabilityKeys.BrowserOpen],
  ["NativeCore.closeBrowser", CapabilityKeys.BrowserOpen],
  ["NativeCore.hapticsImpact", CapabilityKeys.HapticsImpact],
  ["NativeCore.hapticsNotification", CapabilityKeys.HapticsNotification],
  ["NativeCore.hapticsVibrate", CapabilityKeys.HapticsNotification],
  ["NativeCore.hapticsSelectionStart", CapabilityKeys.HapticsNotification],
  ["NativeCore.hapticsSelectionChanged", CapabilityKeys.HapticsNotification],
  ["NativeCore.hapticsSelectionEnd", CapabilityKeys.HapticsNotification],
  ["NativeCore.getNetworkStatus", CapabilityKeys.NetworkStatus],
  ["NativeCore.onNetworkStatusChange", CapabilityKeys.NetworkListen],
  ["NativeCore.getDeviceInfo", CapabilityKeys.DeviceInfo],
  ["NativeCore.getDeviceId", CapabilityKeys.DeviceId],
  ["NativeCore.getDeviceBatteryInfo", CapabilityKeys.DeviceInfo],
  ["NativeCore.readClipboard", CapabilityKeys.ClipboardRead],
  ["NativeCore.writeClipboard", CapabilityKeys.ClipboardWrite],
  ["NativeCore.setStatusBarStyle", CapabilityKeys.StatusBarStyle],
  ["NativeCore.getStatusBarInfo", CapabilityKeys.StatusBarStyle],
  ["NativeCore.showStatusBar", CapabilityKeys.StatusBarVisibility],
  ["NativeCore.hideStatusBar", CapabilityKeys.StatusBarVisibility],
  ["NativeCore.setStatusBarBackgroundColor", CapabilityKeys.StatusBarBackgroundColor],
  ["NativeCore.setStatusBarOverlaysWebView", CapabilityKeys.StatusBarStyle],
  ["NativeCore.showKeyboard", CapabilityKeys.KeyboardControl],
  ["NativeCore.hideKeyboard", CapabilityKeys.KeyboardControl],
  ["NativeCore.setKeyboardResize", CapabilityKeys.KeyboardControl],
  ["NativeCore.getKeyboardResize", CapabilityKeys.KeyboardControl],
  ["NativeCore.setKeyboardAccessoryBarVisible", CapabilityKeys.KeyboardControl],
  ["NativeCore.onKeyboardWillShow", CapabilityKeys.KeyboardListen],
  ["NativeCore.onKeyboardDidShow", CapabilityKeys.KeyboardListen],
  ["NativeCore.onKeyboardWillHide", CapabilityKeys.KeyboardListen],
  ["NativeCore.onKeyboardDidHide", CapabilityKeys.KeyboardListen],
  ["NativeCore.showSplashScreen", CapabilityKeys.SplashScreenControl],
  ["NativeCore.hideSplashScreen", CapabilityKeys.SplashScreenControl],
  ["NativeCore.getPreference", CapabilityKeys.PreferencesRead],
  ["NativeCore.getPreferenceKeys", CapabilityKeys.PreferencesRead],
  ["NativeCore.setPreference", CapabilityKeys.PreferencesWrite],
  ["NativeCore.removePreference", CapabilityKeys.PreferencesWrite],
  ["NativeCore.clearPreferences", CapabilityKeys.PreferencesWrite],
  ["NativeCore.getScreenOrientation", CapabilityKeys.ScreenOrientationCurrent],
  ["NativeCore.lockScreenOrientation", CapabilityKeys.ScreenOrientationLock],
  ["NativeCore.unlockScreenOrientation", CapabilityKeys.ScreenOrientationLock],
  ["NativeCore.alert", CapabilityKeys.DialogAlert],
  ["NativeCore.confirm", CapabilityKeys.DialogConfirm],
  ["NativeCore.prompt", CapabilityKeys.DialogPrompt],
  ["NativeCore.showToast", CapabilityKeys.ToastShow],
  ["NativeCore.showActionSheet", CapabilityKeys.ActionSheetShow],
  ["NativeCore.getTextZoom", CapabilityKeys.TextZoomGet],
  ["NativeCore.setTextZoom", CapabilityKeys.TextZoomSet],
  ["NativeCore.startDownload", CapabilityKeys.BackgroundDownloadBundle],
  ["NativeCore.getDownloadStatus", CapabilityKeys.BackgroundDownloadBundle],
  ["NativeCore.cancelDownload", CapabilityKeys.BackgroundDownloadBundle],
  ["NativeCore.getStorageFreeSpace", CapabilityKeys.StorageCapacityFreeSpace],
  ["NativeCore.onBackButton", CapabilityKeys.AppExit],
  ["NativeCore.checkPermission", CapabilityKeys.AppState],
  ["NativeCore.requestPermission", CapabilityKeys.AppState],
  ["NativeCore.otaGetCurrentVersion", CapabilityKeys.AppState],
  ["NativeCore.otaActivate", CapabilityKeys.AppState],
  ["NativeCore.otaReset", CapabilityKeys.AppState],
  ["NativeCore.otaDownload", CapabilityKeys.AppState],
]);

/** The capability keys this scanner is able to detect from source. */
export function detectableCapabilityKeys(): string[] {
  return [...new Set(apiPatterns.values())].sort();
}

/**
 * Fail when a declared capability has no way of being detected.
 */
export function assertDetectionCoverage(): void {
  const detectable = new Set(detectableCapabilityKeys());
  const undetectable = ALL_CAPABILITY_KEYS.filter(
    (key) => !detectable.has(key),
  );
  if (undetectable.length > 0) {
    throw new Error(
      "Capability keys with no detection pattern in ota-capability-scan.ts:\n" +
        undetectable.map((key) => `  - ${key}`).join("\n") +
        "\nAdd a token matching the real NativeCore method for each key.",
    );
  }
}

export function scanSourceCapabilityReferences(root: string): string[] {
  assertDetectionCoverage();
  const required = new Set<string>();
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const normalized = fullPath.replace(/\\/g, "/");
        if (
          normalized.includes("/packages/native-core") ||
          normalized.endsWith("/tests") ||
          entry.name === "node_modules" ||
          entry.name === ".next"
        )
          continue;
        visit(fullPath);
      } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
        const source = readFileSync(fullPath, "utf8");
        for (const [token, key] of apiPatterns) {
          const expression = token.endsWith(".")
            ? token.slice(0, -1).replaceAll(".", "\\s*\\.\\s*") + "\\s*\\."
            : token.replaceAll(".", "\\s*\\.\\s*") + "\\s*\\(";
          if (new RegExp(expression).test(source)) required.add(key);
        }
        for (const [name, key] of Object.entries(CapabilityKeys)) {
          if (new RegExp(`CapabilityKeys\\.${name}\\b`).test(source))
            required.add(key);
        }
      }
    }
  };
  visit(root);
  return [...required].sort();
}
