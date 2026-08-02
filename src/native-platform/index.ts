/**
 * Native Platform — the only sanctioned bridge between the application and
 * native device capabilities.
 *
 * Pages, components, hooks, and feature services import from here.
 * Importing `@capacitor/*` anywhere outside `src/native-platform` is a
 * contract violation and is rejected by `npm run architecture:check`.
 *
 * Every module is lazy: the underlying plugin loads on first use, so an
 * uninstalled or web-unsupported plugin degrades to an `Unavailable` error
 * instead of breaking the bundle.
 */

import { barcodeScanner } from "./barcode";
import { camera } from "./camera";
import { files } from "./files";
import { location } from "./location";
import { notifications } from "./notifications";
import { permissionManager } from "./permissions";
import { share } from "./share";
import { speechRecognition } from "./speech";
import { capabilities } from "./capabilities";
import { actionSheet } from "./action-sheet";
import { browser } from "./browser";
import { clipboard } from "./clipboard";
import { device } from "./device";
import { dialog } from "./dialog";
import { haptics } from "./haptics";
import { keyboard } from "./keyboard";
import { network } from "./network";
import { preferences } from "./preferences";
import { screenOrientation } from "./screen-orientation";
import { splashScreen } from "./splash-screen";
import { statusBar } from "./status-bar";
import { textZoom } from "./text-zoom";
import { toast } from "./toast";
import { backgroundDownload } from "./background-download";
import { storageCapacity } from "./storage-capacity";

export const nativePlatform = {
  camera,
  location,
  speech: speechRecognition,
  files,
  share,
  notifications,
  barcode: barcodeScanner,
  permissions: permissionManager,
  capabilities,
  actionSheet,
  browser,
  clipboard,
  device,
  dialog,
  haptics,
  keyboard,
  network,
  preferences,
  screenOrientation,
  splashScreen,
  statusBar,
  textZoom,
  toast,
  backgroundDownload,
  storageCapacity,
} as const;

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------
export {
  NativeErrorCodes,
  NativePlatformError,
  isCancelledError,
  isNativePlatformError,
  type NativeErrorCode,
} from "./core/errors";
export {
  getPlatformName,
  isAndroid,
  isIos,
  isNativePlatform,
  type NativePlatformName,
} from "./core/platform";
export type { Unsubscribe } from "./core/listener";

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------
export * from "./permissions";
export * from "./camera";
export * from "./location";
export * from "./speech";
export * from "./files";
export * from "./share";
export * from "./notifications";
export * from "./barcode";
export * from "./capabilities";
export * from "./action-sheet";
export * from "./browser";
export * from "./clipboard";
export * from "./device";
export * from "./dialog";
export * from "./haptics";
export * from "./keyboard";
export * from "./network";
export * from "./preferences";
export * from "./screen-orientation";
export * from "./splash-screen";
export * from "./status-bar";
export * from "./text-zoom";
export * from "./toast";
export * from "./background-download";
export * from "./storage-capacity";
