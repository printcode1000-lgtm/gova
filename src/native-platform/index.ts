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

export const nativePlatform = {
  camera,
  location,
  speech: speechRecognition,
  files,
  share,
  notifications,
  barcode: barcodeScanner,
  permissions: permissionManager,
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
