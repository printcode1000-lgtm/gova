/**
 * Single responsibility: resolve and cache which declared capabilities are
 * actually usable on the current runtime without requesting permissions.
 */

import { createLazyPlugin } from "../core/lazy-plugin";
import { hasDom, isNativePlatform } from "../core/platform";
import {
  ALL_CAPABILITY_KEYS,
  CapabilityKeys,
  type CapabilityKey,
} from "./capability-keys";
import { SHELL_CAPABILITIES } from "./shell-capabilities";

type PluginFamily =
  | "camera"
  | "location"
  | "speech"
  | "files"
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
  | "backgroundDownload";

const pluginLoaders: Record<
  PluginFamily,
  ReturnType<typeof createLazyPlugin<unknown>>
> = {
  camera: createLazyPlugin(
    "Camera",
    async () => (await import("@capacitor/camera")).Camera,
  ),
  location: createLazyPlugin(
    "Location",
    async () => (await import("@capacitor/geolocation")).Geolocation,
  ),
  speech: createLazyPlugin(
    "SpeechRecognition",
    async () =>
      (await import("@capgo/capacitor-speech-recognition")).SpeechRecognition,
  ),
  files: createLazyPlugin(
    "FilePicker",
    async () => (await import("@capawesome/capacitor-file-picker")).FilePicker,
  ),
  share: createLazyPlugin(
    "Share",
    async () => (await import("@capacitor/share")).Share,
  ),
  shareReceive: createLazyPlugin("ShareReceive", async () => {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isPluginAvailable("ShareReceive")) {
      throw new Error("ShareReceive is not registered in this shell");
    }
    return true;
  }),
  push: createLazyPlugin(
    "PushNotifications",
    async () =>
      (await import("@capacitor/push-notifications")).PushNotifications,
  ),
  localNotifications: createLazyPlugin(
    "LocalNotifications",
    async () =>
      (await import("@capacitor/local-notifications")).LocalNotifications,
  ),
  barcode: createLazyPlugin(
    "BarcodeScanner",
    async () =>
      (await import("@capacitor-mlkit/barcode-scanning")).BarcodeScanner,
  ),
  browser: createLazyPlugin(
    "Browser",
    async () => (await import("@capacitor/browser")).Browser,
  ),
  haptics: createLazyPlugin(
    "Haptics",
    async () => (await import("@capacitor/haptics")).Haptics,
  ),
  network: createLazyPlugin(
    "Network",
    async () => (await import("@capacitor/network")).Network,
  ),
  device: createLazyPlugin(
    "Device",
    async () => (await import("@capacitor/device")).Device,
  ),
  clipboard: createLazyPlugin(
    "Clipboard",
    async () => (await import("@capacitor/clipboard")).Clipboard,
  ),
  statusBar: createLazyPlugin(
    "StatusBar",
    async () => (await import("@capacitor/status-bar")).StatusBar,
  ),
  keyboard: createLazyPlugin(
    "Keyboard",
    async () => (await import("@capacitor/keyboard")).Keyboard,
  ),
  splashScreen: createLazyPlugin(
    "SplashScreen",
    async () => (await import("@capacitor/splash-screen")).SplashScreen,
  ),
  preferences: createLazyPlugin(
    "Preferences",
    async () => (await import("@capacitor/preferences")).Preferences,
  ),
  screenOrientation: createLazyPlugin(
    "ScreenOrientation",
    async () =>
      (await import("@capacitor/screen-orientation")).ScreenOrientation,
  ),
  dialog: createLazyPlugin(
    "Dialog",
    async () => (await import("@capacitor/dialog")).Dialog,
  ),
  toast: createLazyPlugin(
    "Toast",
    async () => (await import("@capacitor/toast")).Toast,
  ),
  actionSheet: createLazyPlugin(
    "ActionSheet",
    async () => (await import("@capacitor/action-sheet")).ActionSheet,
  ),
  textZoom: createLazyPlugin(
    "TextZoom",
    async () => (await import("@capacitor/text-zoom")).TextZoom,
  ),
  backgroundDownload: createLazyPlugin("BackgroundDownload", async () => {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isPluginAvailable("BackgroundDownload")) {
      throw new Error("BackgroundDownload is not registered in this shell");
    }
    return true;
  }),
};

const familyByKey = new Map<CapabilityKey, PluginFamily>([
  [CapabilityKeys.CameraTakePhoto, "camera"],
  [CapabilityKeys.CameraPickImages, "camera"],
  [CapabilityKeys.LocationCurrent, "location"],
  [CapabilityKeys.LocationWatch, "location"],
  [CapabilityKeys.SpeechRecognize, "speech"],
  [CapabilityKeys.FilesPick, "files"],
  [CapabilityKeys.FilesSave, "files"],
  [CapabilityKeys.FilesOpen, "files"],
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
]);

const webCapabilities = new Set<CapabilityKey>([
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
  if (!SHELL_CAPABILITIES.includes(typedKey)) return false;
  if (typedKey === CapabilityKeys.FilesAppStorage) return true;
  const family = familyByKey.get(typedKey);
  return family ? Boolean(await pluginLoaders[family].optional()) : false;
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
