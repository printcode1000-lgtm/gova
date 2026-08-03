/**
 * Single responsibility: declare the capabilities compiled into this native
 * shell so OTA compatibility can be evaluated without prompting permissions.
 */

import { CapabilityKeys, type CapabilityKey } from "./capability-keys";

export const NATIVE_CAPABILITY_VERSION = 3;

/**
 * The oldest store shell this capability set is guaranteed to run on.
 *
 * It is the floor stamped into `manifest.minimumNativeVersion` when a release
 * declares no higher requirement, and the fallback for the installed native
 * version when the build did not pin one. Every consumer — the publisher, the
 * static build, the client bundle, and `next.config.ts` — reads this constant,
 * so the floor can never drift between them.
 *
 * Raise it only together with `SHELL_CAPABILITIES` and a store release whose
 * `native-v*` baseline tag has moved.
 */
export const MINIMUM_SUPPORTED_NATIVE_VERSION = "0.2.0";

export const SHELL_CAPABILITIES: readonly CapabilityKey[] = Object.freeze([
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
  CapabilityKeys.BarcodeScan,
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
