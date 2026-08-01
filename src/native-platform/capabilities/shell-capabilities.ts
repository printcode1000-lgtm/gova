/**
 * Single responsibility: declare the capabilities compiled into this native
 * shell so OTA compatibility can be evaluated without prompting permissions.
 */

import { CapabilityKeys, type CapabilityKey } from "./capability-keys";

export const NATIVE_CAPABILITY_VERSION = 1;

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
]);
