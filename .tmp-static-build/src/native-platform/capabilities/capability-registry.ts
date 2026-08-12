/**
 * Single responsibility: resolve and cache which declared capabilities are
 * actually usable on the current runtime without requesting permissions.
 */

import { createLazyPlugin } from "../core/lazy-plugin";
import { getPlatformName, hasDom, isNativePlatform } from "../core/platform";
import {
  ALL_CAPABILITY_KEYS,
  CapabilityKeys,
  type CapabilityKey,
} from "./capability-keys";
import { shellCapabilitiesFor } from "./shell-capabilities";

type PluginFamily =
  | "app"
  | "camera"
  | "location"
  | "speech"
  | "files"
  | "appStorage"
  | "share"
  | "shareReceive"
  | "push"
  | "localNotifications"
  | "barcode"
  | "browser"
  | "haptics"
  | "network"
  | "device"
  | "clipboard"
  | "statusBar"
  | "keyboard"
  | "splashScreen"
  | "preferences"
  | "screenOrientation"
  | "dialog"
  | "toast"
  | "actionSheet"
  | "textZoom"
  | "backgroundDownload"
  | "storageCapacity";

/**
 * The name each family is registered under inside the native shell.
 *
 * This is the only honest source for "is the native side present?". A dynamic
 * `import()` proves nothing on a device: a plugin's JavaScript ships inside the
 * web bundle, so it always resolves, whether or not the installed shell
 * contains the matching Java/Swift. `Capacitor.isPluginAvailable` reads
 * `PluginHeaders`, which the native bridge injects for the plugins it actually
 * registered, so an OTA bundle cannot talk its way into a capability the
 * installed shell does not have.
 */
export const pluginNameByFamily: Record<PluginFamily, string> = {
  app: "App",
  camera: "Camera",
  location: "Geolocation",
  speech: "SpeechRecognition",
  files: "FilePicker",
  appStorage: "Filesystem",
  share: "Share",
  shareReceive: "ShareReceive",
  push: "PushNotifications",
  localNotifications: "LocalNotifications",
  barcode: "BarcodeScanner",
  browser: "Browser",
  haptics: "Haptics",
  network: "Network",
  device: "Device",
  clipboard: "Clipboard",
  statusBar: "StatusBar",
  keyboard: "Keyboard",
  splashScreen: "SplashScreen",
  preferences: "Preferences",
  screenOrientation: "ScreenOrientation",
  dialog: "Dialog",
  toast: "Toast",
  actionSheet: "ActionSheet",
  textZoom: "TextZoom",
  backgroundDownload: "BackgroundDownload",
  storageCapacity: "StorageCapacity",
};

export const familyByKey = new Map<CapabilityKey, PluginFamily>([
  [CapabilityKeys.AppState, "app"],
  [CapabilityKeys.AppInfo, "app"],
  [CapabilityKeys.AppDeepLink, "app"],
  [CapabilityKeys.AppExit, "app"],
  [CapabilityKeys.CameraTakePhoto, "camera"],
  [CapabilityKeys.CameraPickImages, "camera"],
  [CapabilityKeys.LocationCurrent, "location"],
  [CapabilityKeys.LocationWatch, "location"],
  [CapabilityKeys.SpeechRecognize, "speech"],
  [CapabilityKeys.FilesPick, "files"],
  // `saveToDevice` and `openExternally` stage the file with Filesystem and hand
  // it to the system share sheet — they never touch FilePicker. Mapping them to
  // the picker would report them available on a shell that lacks Share.
  [CapabilityKeys.FilesSave, "share"],
  [CapabilityKeys.FilesOpen, "share"],
  [CapabilityKeys.FilesAppStorage, "appStorage"],
  [CapabilityKeys.ShareSend, "share"],
  [CapabilityKeys.ShareReceive, "shareReceive"],
  [CapabilityKeys.NotificationsPush, "push"],
  [CapabilityKeys.NotificationsLocal, "localNotifications"],
  [CapabilityKeys.BarcodeScan, "barcode"],
  [CapabilityKeys.BrowserOpen, "browser"],
  [CapabilityKeys.HapticsImpact, "haptics"],
  [CapabilityKeys.HapticsNotification, "haptics"],
  [CapabilityKeys.NetworkStatus, "network"],
  [CapabilityKeys.NetworkListen, "network"],
  [CapabilityKeys.DeviceInfo, "device"],
  [CapabilityKeys.DeviceId, "device"],
  [CapabilityKeys.ClipboardRead, "clipboard"],
  [CapabilityKeys.ClipboardWrite, "clipboard"],
  [CapabilityKeys.StatusBarStyle, "statusBar"],
  [CapabilityKeys.StatusBarVisibility, "statusBar"],
  [CapabilityKeys.StatusBarBackgroundColor, "statusBar"],
  [CapabilityKeys.KeyboardControl, "keyboard"],
  [CapabilityKeys.KeyboardListen, "keyboard"],
  [CapabilityKeys.SplashScreenControl, "splashScreen"],
  [CapabilityKeys.PreferencesRead, "preferences"],
  [CapabilityKeys.PreferencesWrite, "preferences"],
  [CapabilityKeys.ScreenOrientationLock, "screenOrientation"],
  [CapabilityKeys.ScreenOrientationCurrent, "screenOrientation"],
  [CapabilityKeys.DialogAlert, "dialog"],
  [CapabilityKeys.DialogConfirm, "dialog"],
  [CapabilityKeys.DialogPrompt, "dialog"],
  [CapabilityKeys.ToastShow, "toast"],
  [CapabilityKeys.ActionSheetShow, "actionSheet"],
  [CapabilityKeys.TextZoomGet, "textZoom"],
  [CapabilityKeys.TextZoomSet, "textZoom"],
  [CapabilityKeys.BackgroundDownloadBundle, "backgroundDownload"],
  [CapabilityKeys.StorageCapacityFreeSpace, "storageCapacity"],
]);

const webCapabilities = new Set<CapabilityKey>([
  // A browser tab has a real lifecycle and a real bundle identity; it has no
  // OS deep-link event and cannot close itself.
  CapabilityKeys.AppState,
  CapabilityKeys.AppInfo,
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
  CapabilityKeys.NotificationsLocal,
  CapabilityKeys.BrowserOpen,
  CapabilityKeys.NetworkStatus,
  CapabilityKeys.NetworkListen,
  CapabilityKeys.DeviceInfo,
  CapabilityKeys.DeviceId,
  CapabilityKeys.ClipboardRead,
  CapabilityKeys.ClipboardWrite,
  CapabilityKeys.PreferencesRead,
  CapabilityKeys.PreferencesWrite,
  CapabilityKeys.DialogAlert,
  CapabilityKeys.DialogConfirm,
  CapabilityKeys.DialogPrompt,
  CapabilityKeys.ScreenOrientationCurrent,
]);

/**
 * The bridge itself is loaded lazily so capability lookups stay failure
 * tolerant: if `@capacitor/core` cannot load at all, every native capability
 * reports absent rather than throwing.
 */
const capacitorBridge = createLazyPlugin(
  "Capacitor",
  async () => (await import("@capacitor/core")).Capacitor,
);

async function resolveCapability(key: string): Promise<boolean> {
  if (!ALL_CAPABILITY_KEYS.includes(key as CapabilityKey)) return false;
  const typedKey = key as CapabilityKey;
  if (!isNativePlatform()) return hasDom() && webCapabilities.has(typedKey);

  // The running bundle's own declaration, for *this* platform. It is a
  // statement of intent that travels with the bundle, so it can narrow the
  // answer but never widen it — the bridge check below is what the decision
  // actually rests on.
  if (!shellCapabilitiesFor(getPlatformName()).includes(typedKey)) return false;

  const family = familyByKey.get(typedKey);
  if (!family) return false;

  const bridge = await capacitorBridge.optional();
  if (!bridge) return false;
  return bridge.isPluginAvailable(pluginNameByFamily[family]);
}

export class CapabilityRegistry {
  private readonly cache = new Map<string, boolean>();
  constructor(
    private readonly resolver: (
      key: string,
    ) => Promise<boolean> = resolveCapability,
  ) {}
  async has(key: string): Promise<boolean> {
    const existing = this.cache.get(key);
    if (existing !== undefined) return existing;
    const available = await this.resolver(key);
    this.cache.set(key, available);
    return available;
  }

  async hasAll(keys: readonly string[]): Promise<boolean> {
    return (await Promise.all(keys.map((key) => this.has(key)))).every(Boolean);
  }

  async missing(keys: readonly string[]): Promise<string[]> {
    const availability = await Promise.all(keys.map((key) => this.has(key)));
    return keys.filter((_, index) => !availability[index]);
  }

  async snapshot(): Promise<Readonly<Record<CapabilityKey, boolean>>> {
    const entries = await Promise.all(
      ALL_CAPABILITY_KEYS.map(
        async (key) => [key, await this.has(key)] as const,
      ),
    );
    return Object.freeze(Object.fromEntries(entries)) as Readonly<
      Record<CapabilityKey, boolean>
    >;
  }
}

export const capabilities = new CapabilityRegistry();
