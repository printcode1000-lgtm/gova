/**
 * Single responsibility: declare the capabilities compiled into this native
 * shell so OTA compatibility can be evaluated without prompting permissions.
 *
 * The declaration is **per platform**, because the shells are not identical.
 * A single flat list forced every platform to claim the union, which turned a
 * plugin missing on one platform into either a silent no-op there, or — once
 * capability detection became honest — a release the whole platform refuses.
 */

import type { NativePlatformName } from "../core/platform";
import { CapabilityKeys, type CapabilityKey } from "./capability-keys";

export const NATIVE_CAPABILITY_VERSION = 4;

/**
 * The oldest store shell this capability set is guaranteed to run on.
 *
 * It is the floor stamped into `manifest.minimumNativeVersion` when a release
 * declares no higher requirement, and the fallback for the installed native
 * version when the build did not pin one. Every consumer — the publisher, the
 * static build, the client bundle, and `next.config.ts` — reads this constant,
 * so the floor can never drift between them.
 *
 * Raise it only together with the declarations below and a store release whose
 * `native-v*` baseline tag has moved.
 */
export const MINIMUM_SUPPORTED_NATIVE_VERSION = "0.2.0";

/**
 * The first store shell whose client understands `optionalCapabilities`.
 *
 * The field is part of the signed payload, so a client built before it existed
 * computes a different canonical string and rejects the release as
 * "signature is invalid" — and a device that rejects every release can only be
 * recovered from the store. The publisher therefore omits the field entirely
 * while `minimumNativeVersion` is below this, which reproduces the pre-split
 * payload exactly.
 *
 * Move this only alongside a store release that has actually shipped.
 */
export const OPTIONAL_CAPABILITIES_MINIMUM_NATIVE_VERSION = "0.2.1";

export interface CapabilityAvailability {
  /**
   * First native version whose **shell contains the plugin** behind this key.
   * Below this, a device genuinely cannot run the feature.
   */
  backedSince: string;
  /**
   * First native version whose **client knows the key name**.
   *
   * This matters because a shipped client answers `false` for any key outside
   * its own `ALL_CAPABILITY_KEYS`. Listing a newer key in `requiredCapabilities`
   * therefore does not make an old device cautious — it makes it refuse every
   * release, forever, recoverable only from the store.
   */
  vocabularySince: string;
}

/** The vocabulary and plugin set that shipped in the first tracked shell. */
const SHIPPED_0_2_0: CapabilityAvailability = Object.freeze({
  backedSince: "0.2.0",
  vocabularySince: "0.2.0",
});

/**
 * `@capacitor/app` was compiled into the 0.2.0 shell all along; only the
 * capability keys naming it are new. The plugin is backed everywhere, the words
 * for it are not, so these keys are withheld from manifests aimed at 0.2.0
 * rather than published and rejected.
 */
const APP_KEYS_NAMED_IN_0_2_1: CapabilityAvailability = Object.freeze({
  backedSince: "0.2.0",
  vocabularySince: "0.2.1",
});

/**
 * When each key became meaningful. Every key needs an entry — the compiler
 * rejects an incomplete record — so adding a capability forces a deliberate
 * answer to "can the shells already out there run and name this?".
 */
export const CAPABILITY_AVAILABILITY: Readonly<
  Record<CapabilityKey, CapabilityAvailability>
> = Object.freeze({
  [CapabilityKeys.AppState]: APP_KEYS_NAMED_IN_0_2_1,
  [CapabilityKeys.AppInfo]: APP_KEYS_NAMED_IN_0_2_1,
  [CapabilityKeys.AppDeepLink]: APP_KEYS_NAMED_IN_0_2_1,
  [CapabilityKeys.AppExit]: APP_KEYS_NAMED_IN_0_2_1,
  [CapabilityKeys.CameraTakePhoto]: SHIPPED_0_2_0,
  [CapabilityKeys.CameraPickImages]: SHIPPED_0_2_0,
  [CapabilityKeys.LocationCurrent]: SHIPPED_0_2_0,
  [CapabilityKeys.LocationWatch]: SHIPPED_0_2_0,
  [CapabilityKeys.SpeechRecognize]: SHIPPED_0_2_0,
  [CapabilityKeys.FilesPick]: SHIPPED_0_2_0,
  [CapabilityKeys.FilesSave]: SHIPPED_0_2_0,
  [CapabilityKeys.FilesOpen]: SHIPPED_0_2_0,
  [CapabilityKeys.FilesAppStorage]: SHIPPED_0_2_0,
  [CapabilityKeys.ShareSend]: SHIPPED_0_2_0,
  [CapabilityKeys.ShareReceive]: SHIPPED_0_2_0,
  [CapabilityKeys.NotificationsPush]: SHIPPED_0_2_0,
  [CapabilityKeys.NotificationsLocal]: SHIPPED_0_2_0,
  [CapabilityKeys.BarcodeScan]: SHIPPED_0_2_0,
  [CapabilityKeys.BrowserOpen]: SHIPPED_0_2_0,
  [CapabilityKeys.HapticsImpact]: SHIPPED_0_2_0,
  [CapabilityKeys.HapticsNotification]: SHIPPED_0_2_0,
  [CapabilityKeys.NetworkStatus]: SHIPPED_0_2_0,
  [CapabilityKeys.NetworkListen]: SHIPPED_0_2_0,
  [CapabilityKeys.DeviceInfo]: SHIPPED_0_2_0,
  [CapabilityKeys.DeviceId]: SHIPPED_0_2_0,
  [CapabilityKeys.ClipboardRead]: SHIPPED_0_2_0,
  [CapabilityKeys.ClipboardWrite]: SHIPPED_0_2_0,
  [CapabilityKeys.StatusBarStyle]: SHIPPED_0_2_0,
  [CapabilityKeys.StatusBarVisibility]: SHIPPED_0_2_0,
  [CapabilityKeys.StatusBarBackgroundColor]: SHIPPED_0_2_0,
  [CapabilityKeys.KeyboardControl]: SHIPPED_0_2_0,
  [CapabilityKeys.KeyboardListen]: SHIPPED_0_2_0,
  [CapabilityKeys.SplashScreenControl]: SHIPPED_0_2_0,
  [CapabilityKeys.PreferencesRead]: SHIPPED_0_2_0,
  [CapabilityKeys.PreferencesWrite]: SHIPPED_0_2_0,
  [CapabilityKeys.ScreenOrientationLock]: SHIPPED_0_2_0,
  [CapabilityKeys.ScreenOrientationCurrent]: SHIPPED_0_2_0,
  [CapabilityKeys.DialogAlert]: SHIPPED_0_2_0,
  [CapabilityKeys.DialogConfirm]: SHIPPED_0_2_0,
  [CapabilityKeys.DialogPrompt]: SHIPPED_0_2_0,
  [CapabilityKeys.ToastShow]: SHIPPED_0_2_0,
  [CapabilityKeys.ActionSheetShow]: SHIPPED_0_2_0,
  [CapabilityKeys.TextZoomGet]: SHIPPED_0_2_0,
  [CapabilityKeys.TextZoomSet]: SHIPPED_0_2_0,
  [CapabilityKeys.BackgroundDownloadBundle]: SHIPPED_0_2_0,
  [CapabilityKeys.StorageCapacityFreeSpace]: SHIPPED_0_2_0,
});

/** Capabilities every native shell contains, on every platform. */
const UNIVERSAL: readonly CapabilityKey[] = Object.freeze([
  CapabilityKeys.AppState,
  CapabilityKeys.AppInfo,
  CapabilityKeys.AppDeepLink,
  CapabilityKeys.AppExit,
  CapabilityKeys.CameraTakePhoto,
  CapabilityKeys.CameraPickImages,
  CapabilityKeys.LocationCurrent,
  CapabilityKeys.LocationWatch,
  CapabilityKeys.SpeechRecognize,
  CapabilityKeys.FilesPick,
  CapabilityKeys.FilesSave,
  CapabilityKeys.FilesOpen,
  CapabilityKeys.FilesAppStorage,
  CapabilityKeys.ShareSend,
  CapabilityKeys.ShareReceive,
  CapabilityKeys.NotificationsPush,
  CapabilityKeys.NotificationsLocal,
  CapabilityKeys.BrowserOpen,
  CapabilityKeys.HapticsImpact,
  CapabilityKeys.HapticsNotification,
  CapabilityKeys.NetworkStatus,
  CapabilityKeys.NetworkListen,
  CapabilityKeys.DeviceInfo,
  CapabilityKeys.DeviceId,
  CapabilityKeys.ClipboardRead,
  CapabilityKeys.ClipboardWrite,
  CapabilityKeys.StatusBarStyle,
  CapabilityKeys.StatusBarVisibility,
  CapabilityKeys.StatusBarBackgroundColor,
  CapabilityKeys.KeyboardControl,
  CapabilityKeys.KeyboardListen,
  CapabilityKeys.SplashScreenControl,
  CapabilityKeys.PreferencesRead,
  CapabilityKeys.PreferencesWrite,
  CapabilityKeys.ScreenOrientationLock,
  CapabilityKeys.ScreenOrientationCurrent,
  CapabilityKeys.DialogAlert,
  CapabilityKeys.DialogConfirm,
  CapabilityKeys.DialogPrompt,
  CapabilityKeys.ToastShow,
  CapabilityKeys.ActionSheetShow,
  CapabilityKeys.TextZoomGet,
  CapabilityKeys.TextZoomSet,
  CapabilityKeys.BackgroundDownloadBundle,
  CapabilityKeys.StorageCapacityFreeSpace,
]);

/**
 * What each shell actually contains.
 *
 * `barcode.scan` is **Android only**. `@capacitor-mlkit/barcode-scanning`
 * ships a CocoaPods podspec and no `Package.swift`, and `ios/App` is an
 * SPM-only project with no Podfile, so the plugin is not compiled into the iOS
 * shell at all. Declaring it for iOS would either hide a permanently broken
 * entry point or, worse, put `barcode.scan` into a manifest's required set and
 * make every iOS device refuse the release.
 *
 * Restoring it on iOS means adding CocoaPods alongside SPM and rebuilding on
 * macOS. Until that happens, this is the honest declaration.
 */
export const SHELL_CAPABILITIES_BY_PLATFORM: Readonly<
  Record<Exclude<NativePlatformName, "web">, readonly CapabilityKey[]>
> = Object.freeze({
  android: Object.freeze([...UNIVERSAL, CapabilityKeys.BarcodeScan]),
  ios: UNIVERSAL,
});

const NATIVE_PLATFORMS = Object.keys(
  SHELL_CAPABILITIES_BY_PLATFORM,
) as Array<Exclude<NativePlatformName, "web">>;

/** Capabilities present on **every** native platform. */
export const UNIVERSAL_SHELL_CAPABILITIES: readonly CapabilityKey[] =
  Object.freeze(
    NATIVE_PLATFORMS.reduce<CapabilityKey[]>(
      (shared, platform) =>
        shared.filter((key) =>
          SHELL_CAPABILITIES_BY_PLATFORM[platform].includes(key),
        ),
      [...SHELL_CAPABILITIES_BY_PLATFORM[NATIVE_PLATFORMS[0]]],
    ),
  );

/**
 * Capabilities present on some native platforms but not all.
 *
 * A bundle may use these, but only behind a runtime `capabilities.has()` check
 * or a feature flag. The OTA gate records them without blocking, so one
 * platform-specific feature can never stop the update channel for a platform
 * that cannot run it.
 */
export const PLATFORM_OPTIONAL_SHELL_CAPABILITIES: readonly CapabilityKey[] =
  Object.freeze(
    [
      ...new Set(
        NATIVE_PLATFORMS.flatMap((platform) => [
          ...SHELL_CAPABILITIES_BY_PLATFORM[platform],
        ]),
      ),
    ]
      .filter((key) => !UNIVERSAL_SHELL_CAPABILITIES.includes(key))
      .sort(),
  );

/** The capabilities the shell on `platform` declares. */
export function shellCapabilitiesFor(
  platform: NativePlatformName,
): readonly CapabilityKey[] {
  if (platform === "web") return [];
  return SHELL_CAPABILITIES_BY_PLATFORM[platform];
}
