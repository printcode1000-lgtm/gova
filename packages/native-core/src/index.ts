/**
 * @asol/native-core — single sealed public entry point.
 *
 * Rules:
 * - Import ONLY from this root specifier, never from sub-paths.
 * - Zero Capacitor types are exported from here.
 * - Every operation returns a Result union.
 * - Zero raw adapter objects exposed in the public API.
 */

// ── Capacitor plugin manifest ─────────────────────────────────────────────
// The plugin allowlist `capacitor.config.ts` needs. Declared here because this
// package declares the plugins; the config file used to derive it by reaching
// into this package's package.json by relative path.
export { CAPACITOR_INCLUDE_PLUGINS } from "./domain/capacitor-plugin-manifest";

// ── Public Facade ─────────────────────────────────────────────────────────
export { NativeCore } from "./api/native-core.api";

// ── Error types ───────────────────────────────────────────────────────────
export {
  NativeCoreError,
  NativeErrorCodes,
  isNativeCoreError,
  isCancelledError,
  isPermissionDeniedError,
  isUnavailableError,
} from "./errors/native-core-error";
export type { NativeErrorCode } from "./errors/native-core-error";

// ── Result monad ──────────────────────────────────────────────────────────
export { ok, err, unwrap, isOk, isErr, type Result } from "./domain/result";

// ── Capability vocabulary & Registry ──────────────────────────────────────
export {
  CapabilityKeys,
  ALL_CAPABILITY_KEYS,
} from "./domain/capabilities/capability-keys";
export type { CapabilityKey } from "./domain/capabilities/capability-keys";

export {
  NATIVE_CAPABILITY_VERSION,
  MINIMUM_SUPPORTED_NATIVE_VERSION,
  OPTIONAL_CAPABILITIES_MINIMUM_NATIVE_VERSION,
  CAPABILITY_AVAILABILITY,
  SHELL_CAPABILITIES_BY_PLATFORM,
  UNIVERSAL_SHELL_CAPABILITIES,
  PLATFORM_OPTIONAL_SHELL_CAPABILITIES,
  shellCapabilitiesFor,
} from "./domain/capabilities/shell-capabilities";
export type { CapabilityAvailability } from "./domain/capabilities/shell-capabilities";

export {
  capabilities,
  CapabilityRegistry,
  pluginNameByFamily,
  familyByKey,
} from "./capabilities/capability-registry";
export type { PluginFamily } from "./capabilities/capability-registry";

// ── Permission vocabulary ─────────────────────────────────────────────────
export {
  PermissionKinds,
  PermissionStates,
  toPermissionResult,
  mapPermissionState,
} from "./domain/permissions/permission-kinds";
export type {
  PermissionKind,
  PermissionState,
  PermissionResult,
} from "./domain/permissions/permission-kinds";

// ── Notification channel constants ────────────────────────────────────────
export {
  DEFAULT_CHANNELS,
  DEFAULT_CHANNEL_ID,
  DEFAULT_CHANNEL_SOUND,
  FROZEN_CHANNEL_IDS,
} from "./domain/notifications/channel-constants";
export type { NotificationChannel } from "./domain/notifications/channel-constants";

// ── Platform defaults (Domain naming) ─────────────────────────────────────
export {
  API_BASE_URL,
  CONTROL_BASE_URL,
  NOTIFICATIONS_BASE_URL,
  PRODUCTS_BASE_URL,
  ORDERS_BASE_URL,
  PROFILES_BASE_URL,
  SUBMAIN_BASE_URL,
  SUB2MAIN_BASE_URL,
} from "./domain/defaults/platform-defaults";

// ── Platform identity ─────────────────────────────────────────────────────
export {
  getPlatformName,
  isAndroid,
  isIos,
  isNativePlatform,
  hasDom,
} from "./adapters/platform.adapter";
export type { NativePlatformName } from "./domain/platform/platform-types";

// ── Share Security & Queue ────────────────────────────────────────────────
export {
  MAX_RECEIVED_BYTES,
  isSafeUrl,
} from "./domain/share/share-validator";
export type {
  ValidatedReceivedItem,
  ReceivedTextItem,
  ReceivedUrlItem,
  ReceivedFileItem,
  ReceivedItemKind,
} from "./domain/share/share-validator";
export type { ShareListener } from "./domain/share/share-queue";

// ── Domain DTOs ───────────────────────────────────────────────────────────
export type { CameraImage, PhotoOptions, PickImagesOptions } from "./domain/camera/types";
export type {
  PickFilesOptions,
  PickedFile,
  SaveFileOptions,
  SaveFileResult,
  ReadFileOptions,
  ReadFileResult,
  DeleteFileOptions,
} from "./domain/files/types";
export type { ShareOptions, ShareResult, ReceivedShare } from "./domain/share/types";
export type { BarcodeScanOptions, BarcodeScanResult, BarcodeResult } from "./domain/barcode/types";
export type { LocationFix, LocationOptions, LocationWatchCallback } from "./domain/location/types";
export type { SpeechOptions, SpeechRecognitionResult, SpeechRecognitionLanguage } from "./domain/speech/types";
export type { AppInfo, AppState, AppLaunchUrl, AppRestoredResult } from "./domain/app/types";
export type { DeviceInfo, DeviceBatteryInfo, DeviceId } from "./domain/device/types";
export type { NetworkStatus, ConnectionType } from "./domain/network/types";
export type { ImpactOptions, NotificationOptions, VibrateOptions } from "./domain/haptics/types";
export type {
  StatusBarStyle,
  StatusBarInfo,
  SetStatusBarStyleOptions,
  SetStatusBarBackgroundColorOptions,
  SetStatusBarAnimationOptions,
} from "./domain/status-bar/types";
export type { KeyboardInfo, SetKeyboardResizeOptions } from "./domain/keyboard/types";
export type { AlertOptions, ConfirmOptions, ConfirmResult, PromptOptions, PromptResult } from "./domain/dialog/types";
export type { ShowActionSheetOptions, ShowActionSheetResult, ActionSheetButton } from "./domain/action-sheet/types";
export type { ShowToastOptions } from "./domain/toast/types";
export type { TextZoomResult, SetTextZoomOptions } from "./domain/text-zoom/types";
export type { OrientationType, OrientationLockType, ScreenOrientationResult, LockOrientationOptions } from "./domain/screen-orientation/types";
export type {
  BackgroundDownloadTask,
  StartDownloadOptions,
  BackgroundDownloadProgress,
  BackgroundDownloadStatus,
  DownloadState,
} from "./domain/background-download/types";
export type { StorageCapacity, StorageCapacityResult } from "./domain/storage-capacity/types";
export type { ClipboardReadResult, ClipboardWriteOptions } from "./domain/clipboard/types";
export type { OpenBrowserOptions } from "./domain/browser/types";
export type { PreferenceGetResult, PreferenceKeysResult } from "./domain/preferences/types";
export type { ShowSplashOptions, HideSplashOptions } from "./domain/splash-screen/types";
export type { BackButtonEvent, BackButtonListener } from "./domain/navigation/types";
export type { OtaHttpOptions } from "./domain/ota/types";
export type {
  NotificationPayload,
  NotificationInboxRecord,
  NotificationInboxTap,
  NotificationTapListener,
  PushToken,
  PushTokenListener,
  NotificationListener,
  NotificationActionListener,
  LocalNotificationSchedule,
} from "./domain/notifications/types";
export type { Unsubscribe } from "./domain/listener";
