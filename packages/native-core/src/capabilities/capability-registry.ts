/**
 * Capability registry for @asol/native-core.
 * Resolves and caches which declared capabilities are actually usable on the
 * current runtime without requesting permissions.
 */

import { Capacitor } from "@capacitor/core";
import { getPlatformName, hasDom, isNativePlatform } from "../adapters/platform.adapter";
import {
  ALL_CAPABILITY_KEYS,
  CapabilityKeys,
  type CapabilityKey,
} from "../domain/capabilities/capability-keys";
import { shellCapabilitiesFor } from "../domain/capabilities/shell-capabilities";

export type PluginFamily =
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

async function resolveCapability(key: string): Promise<boolean> {
  if (!ALL_CAPABILITY_KEYS.includes(key as CapabilityKey)) return false;
  const typedKey = key as CapabilityKey;
  if (!isNativePlatform()) return hasDom() && webCapabilities.has(typedKey);

  if (!shellCapabilitiesFor(getPlatformName()).includes(typedKey)) return false;

  const family = familyByKey.get(typedKey);
  if (!family) return false;

  try {
    return Capacitor.isPluginAvailable(pluginNameByFamily[family]);
  } catch {
    return false;
  }
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
