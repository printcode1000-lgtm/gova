/**
 * Public Camera API.
 *
 * Single responsibility: choose the right adapter for the platform and
 * guarantee permissions before delegating. It contains no plugin code and
 * no byte handling.
 */

import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import { permissionManager } from "../permissions/permission-manager";
import { PermissionKinds } from "../permissions/types";
import { nativeCapturePhoto, nativePickImages } from "./camera-native-adapter";
import { webCapturePhoto, webPickImages } from "./camera-web-adapter";
import type {
  CameraImage,
  CapturePhotoOptions,
  PickImageOptions,
} from "./types";

const MODULE = "Camera";

export class CameraModule {
  /** True when this platform can produce images at all. */
  async isAvailable(): Promise<boolean> {
    if (isNativePlatform()) return true;
    return typeof document !== "undefined";
  }

  /**
   * Open the camera and return one photo.
   * @throws `Cancelled` when the user backs out.
   * @throws `PermissionDenied` when camera access is refused.
   */
  async takePhoto(options: CapturePhotoOptions = {}): Promise<CameraImage> {
    if (isNativePlatform()) {
      const permission = await permissionManager.requestIfNeeded(
        PermissionKinds.Camera,
      );
      if (!permission.granted) {
        throw NativePlatformError.permissionDenied(
          MODULE,
          permission.requiresSettings
            ? "Camera access is blocked. Enable it from the application settings."
            : "Camera access was not granted.",
        );
      }
      return nativeCapturePhoto(options);
    }
    return webCapturePhoto(options);
  }

  /** Pick a single image from the gallery. */
  async pickImage(options: PickImageOptions = {}): Promise<CameraImage> {
    const images = await this.pickImages({ ...options, multiple: false });
    const image = images[0];
    if (!image) throw NativePlatformError.cancelled(MODULE);
    return image;
  }

  /** Pick one or more images from the gallery. */
  async pickImages(options: PickImageOptions = {}): Promise<CameraImage[]> {
    if (isNativePlatform()) {
      const permission = await permissionManager.requestIfNeeded(
        PermissionKinds.Photos,
      );
      if (!permission.granted) {
        throw NativePlatformError.permissionDenied(
          MODULE,
          permission.requiresSettings
            ? "Photo access is blocked. Enable it from the application settings."
            : "Photo access was not granted.",
        );
      }
      return nativePickImages(options);
    }
    return webPickImages(options);
  }
}

export const camera = new CameraModule();
