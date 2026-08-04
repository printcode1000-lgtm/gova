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
} from "../../src/native-platform/capabilities/capability-keys";
import {
  CAPABILITY_AVAILABILITY,
  OPTIONAL_CAPABILITIES_MINIMUM_NATIVE_VERSION,
  PLATFORM_OPTIONAL_SHELL_CAPABILITIES,
  type CapabilityAvailability,
} from "../../src/native-platform/capabilities/shell-capabilities";
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
 * Every token must name a method that actually exists on a Native Platform
 * facade. A token that matches nothing is worse than no token at all: the
 * capability silently disappears from `requiredCapabilities`, and the client
 * gate stops protecting it. `assertDetectionCoverage` keeps the map honest by
 * failing when a capability key has no token at all, and the Native Platform
 * API tests keep the method names honest.
 *
 * A token ending in `.` matches any member access below that prefix; every
 * other token must be followed by a call.
 */
const apiPatterns = new Map<string, string>([
  ["app.state", CapabilityKeys.AppState],
  ["app.onStateChange", CapabilityKeys.AppState],
  ["app.info", CapabilityKeys.AppInfo],
  ["app.onDeepLink", CapabilityKeys.AppDeepLink],
  ["app.exit", CapabilityKeys.AppExit],
  ["app.canExit", CapabilityKeys.AppExit],
  ["camera.takePhoto", CapabilityKeys.CameraTakePhoto],
  ["camera.pickImage", CapabilityKeys.CameraPickImages],
  ["camera.pickImages", CapabilityKeys.CameraPickImages],
  ["location.getCurrentPosition", CapabilityKeys.LocationCurrent],
  ["location.watchPosition", CapabilityKeys.LocationWatch],
  ["speech.startListening", CapabilityKeys.SpeechRecognize],
  ["speech.transcribeOnce", CapabilityKeys.SpeechRecognize],
  ["speechRecognition.transcribeOnce", CapabilityKeys.SpeechRecognize],
  ["speechRecognition.startListening", CapabilityKeys.SpeechRecognize],
  ["files.user.pickFile", CapabilityKeys.FilesPick],
  ["files.user.pickFiles", CapabilityKeys.FilesPick],
  ["files.user.pickImages", CapabilityKeys.FilesPick],
  ["files.user.pickPdf", CapabilityKeys.FilesPick],
  ["files.user.pickDocuments", CapabilityKeys.FilesPick],
  ["files.user.saveToDevice", CapabilityKeys.FilesSave],
  ["files.user.openExternally", CapabilityKeys.FilesOpen],
  ["files.app.", CapabilityKeys.FilesAppStorage],
  ["share.send", CapabilityKeys.ShareSend],
  ["share.canSend", CapabilityKeys.ShareSend],
  ["share.initializeReceiving", CapabilityKeys.ShareReceive],
  ["share.getPendingItems", CapabilityKeys.ShareReceive],
  ["share.consumeItem", CapabilityKeys.ShareReceive],
  ["share.consumeAllItems", CapabilityKeys.ShareReceive],
  ["notifications.push.", CapabilityKeys.NotificationsPush],
  ["notifications.local.", CapabilityKeys.NotificationsLocal],
  ["pushNotifications.", CapabilityKeys.NotificationsPush],
  ["localNotifications.", CapabilityKeys.NotificationsLocal],
  ["barcode.scanOnce", CapabilityKeys.BarcodeScan],
  ["barcode.startScan", CapabilityKeys.BarcodeScan],
  ["barcodeScanner.scanOnce", CapabilityKeys.BarcodeScan],
  ["barcodeScanner.startScan", CapabilityKeys.BarcodeScan],
  ["browser.open", CapabilityKeys.BrowserOpen],
  ["haptics.impact", CapabilityKeys.HapticsImpact],
  ["haptics.notification", CapabilityKeys.HapticsNotification],
  ["network.getStatus", CapabilityKeys.NetworkStatus],
  ["network.addListener", CapabilityKeys.NetworkListen],
  ["device.getInfo", CapabilityKeys.DeviceInfo],
  ["device.getId", CapabilityKeys.DeviceId],
  ["clipboard.read", CapabilityKeys.ClipboardRead],
  ["clipboard.write", CapabilityKeys.ClipboardWrite],
  ["statusBar.setStyle", CapabilityKeys.StatusBarStyle],
  ["statusBar.setVisible", CapabilityKeys.StatusBarVisibility],
  ["statusBar.setBackgroundColor", CapabilityKeys.StatusBarBackgroundColor],
  ["keyboard.show", CapabilityKeys.KeyboardControl],
  ["keyboard.hide", CapabilityKeys.KeyboardControl],
  ["keyboard.onWillShow", CapabilityKeys.KeyboardListen],
  ["keyboard.onWillHide", CapabilityKeys.KeyboardListen],
  ["splashScreen.show", CapabilityKeys.SplashScreenControl],
  ["splashScreen.hide", CapabilityKeys.SplashScreenControl],
  ["preferences.get", CapabilityKeys.PreferencesRead],
  ["preferences.set", CapabilityKeys.PreferencesWrite],
  ["preferences.remove", CapabilityKeys.PreferencesWrite],
  ["screenOrientation.current", CapabilityKeys.ScreenOrientationCurrent],
  ["screenOrientation.lock", CapabilityKeys.ScreenOrientationLock],
  ["screenOrientation.unlock", CapabilityKeys.ScreenOrientationLock],
  ["dialog.alert", CapabilityKeys.DialogAlert],
  ["dialog.confirm", CapabilityKeys.DialogConfirm],
  ["dialog.prompt", CapabilityKeys.DialogPrompt],
  ["toast.show", CapabilityKeys.ToastShow],
  ["actionSheet.show", CapabilityKeys.ActionSheetShow],
  ["textZoom.get", CapabilityKeys.TextZoomGet],
  ["textZoom.set", CapabilityKeys.TextZoomSet],
  ["backgroundDownload.schedule", CapabilityKeys.BackgroundDownloadBundle],
  ["backgroundDownload.status", CapabilityKeys.BackgroundDownloadBundle],
  ["backgroundDownload.read", CapabilityKeys.BackgroundDownloadBundle],
  ["storageCapacity.getFreeSpace", CapabilityKeys.StorageCapacityFreeSpace],
]);

/** The capability keys this scanner is able to detect from source. */
export function detectableCapabilityKeys(): string[] {
  return [...new Set(apiPatterns.values())].sort();
}

/**
 * Fail when a declared capability has no way of being detected.
 *
 * An undetectable key never reaches `requiredCapabilities`, so the device-side
 * gate cannot refuse a bundle that needs it. That is exactly the silent
 * degradation the golden rule exists to prevent, so it is a build error rather
 * than a warning.
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
        "\nAdd a token matching the real Native Platform method for each key.",
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
        if (
          fullPath.replace(/\\/g, "/").endsWith("/native-platform") ||
          entry.name === "tests"
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
