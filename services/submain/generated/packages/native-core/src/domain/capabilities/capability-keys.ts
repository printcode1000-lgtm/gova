/**
 * Stable capability vocabulary shared by web bundles, native shells, OTA manifests, and feature flags.
 */

export const CapabilityKeys = Object.freeze({
  AppState: "app.state",
  AppInfo: "app.info",
  AppDeepLink: "app.deepLink",
  AppExit: "app.exit",
  CameraTakePhoto: "camera.takePhoto",
  CameraPickImages: "camera.pickImages",
  LocationCurrent: "location.current",
  LocationWatch: "location.watch",
  SpeechRecognize: "speech.recognize",
  FilesPick: "files.pick",
  FilesSave: "files.save",
  FilesOpen: "files.open",
  FilesAppStorage: "files.appStorage",
  ShareSend: "share.send",
  ShareReceive: "share.receive",
  NotificationsPush: "notifications.push",
  NotificationsLocal: "notifications.local",
  BarcodeScan: "barcode.scan",
  BrowserOpen: "browser.open",
  HapticsImpact: "haptics.impact",
  HapticsNotification: "haptics.notification",
  NetworkStatus: "network.status",
  NetworkListen: "network.listen",
  DeviceInfo: "device.info",
  DeviceId: "device.id",
  ClipboardRead: "clipboard.read",
  ClipboardWrite: "clipboard.write",
  StatusBarStyle: "statusBar.style",
  StatusBarVisibility: "statusBar.visibility",
  StatusBarBackgroundColor: "statusBar.backgroundColor",
  KeyboardControl: "keyboard.control",
  KeyboardListen: "keyboard.listen",
  SplashScreenControl: "splashScreen.control",
  PreferencesRead: "preferences.read",
  PreferencesWrite: "preferences.write",
  ScreenOrientationLock: "screenOrientation.lock",
  ScreenOrientationCurrent: "screenOrientation.current",
  DialogAlert: "dialog.alert",
  DialogConfirm: "dialog.confirm",
  DialogPrompt: "dialog.prompt",
  ToastShow: "toast.show",
  ActionSheetShow: "actionSheet.show",
  TextZoomGet: "textZoom.get",
  TextZoomSet: "textZoom.set",
  BackgroundDownloadBundle: "backgroundDownload.bundle",
  StorageCapacityFreeSpace: "storageCapacity.freeSpace",
} as const);

export type CapabilityKey =
  (typeof CapabilityKeys)[keyof typeof CapabilityKeys];

export const ALL_CAPABILITY_KEYS = Object.freeze(
  Object.values(CapabilityKeys),
) as readonly CapabilityKey[];
