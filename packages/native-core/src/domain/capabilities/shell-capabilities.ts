import type { NativePlatformName } from "../platform/platform-types";
import { CapabilityKeys, type CapabilityKey } from "./capability-keys";

export const NATIVE_CAPABILITY_VERSION = 4;
export const MINIMUM_SUPPORTED_NATIVE_VERSION = "0.2.0";
export const OPTIONAL_CAPABILITIES_MINIMUM_NATIVE_VERSION = "0.2.1";

export interface CapabilityAvailability {
  backedSince: string;
  vocabularySince: string;
}

const SHIPPED_0_2_0: CapabilityAvailability = Object.freeze({
  backedSince: "0.2.0",
  vocabularySince: "0.2.0",
});

const APP_KEYS_NAMED_IN_0_2_1: CapabilityAvailability = Object.freeze({
  backedSince: "0.2.0",
  vocabularySince: "0.2.1",
});

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

export const SHELL_CAPABILITIES_BY_PLATFORM: Readonly<
  Record<Exclude<NativePlatformName, "web">, readonly CapabilityKey[]>
> = Object.freeze({
  android: Object.freeze([...UNIVERSAL, CapabilityKeys.BarcodeScan]),
  ios: UNIVERSAL,
});

const NATIVE_PLATFORMS = Object.keys(
  SHELL_CAPABILITIES_BY_PLATFORM,
) as Array<Exclude<NativePlatformName, "web">>;

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

export function shellCapabilitiesFor(
  platform: NativePlatformName,
): readonly CapabilityKey[] {
  if (platform === "web") return [];
  return SHELL_CAPABILITIES_BY_PLATFORM[platform];
}
