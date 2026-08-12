/**
 * Compatibility shim over the Native Platform Camera module.
 *
 * `StorageImageManager` consumes this narrow interface, where a cancelled
 * pick resolves to `null` rather than throwing. All camera, byte inspection,
 * and permission handling now lives in `src/native-platform/camera`; this file
 * only adapts the shape and must not import a Capacitor plugin.
 */

import { camera } from "@/native-platform/camera";
import {
  isCancelledError,
  isPermissionDeniedError,
  permissionErrorRequiresSettings,
} from "@/native-platform/core/errors";
import { isNativePlatform } from "@/native-platform/core/platform";
import { permissionManager } from "@/native-platform/permissions";

export function canUseNativeImageSource(): boolean {
  return isNativePlatform();
}

/**
 * Permission refusal is an expected user decision, not an image-source crash.
 * The UI uses this boundary to show guidance without reporting console errors.
 */
export function isImageSourcePermissionDenied(error: unknown): boolean {
  return isPermissionDeniedError(error);
}

export function imageSourcePermissionRequiresSettings(error: unknown): boolean {
  return permissionErrorRequiresSettings(error);
}

export function openImageSourceSettings(): Promise<boolean> {
  return permissionManager.openSettings();
}

/** @returns The captured image, or `null` when unavailable or cancelled. */
export async function captureSingleImage(): Promise<File | null> {
  if (!canUseNativeImageSource()) return null;
  try {
    const image = await camera.takePhoto({
      direction: "rear",
      quality: "high",
      correctOrientation: true,
      saveToGallery: false,
    });
    return image.file;
  } catch (error) {
    if (isCancelledError(error)) return null;
    throw error;
  }
}

/** @returns The selected image, or `null` when unavailable or cancelled. */
export async function chooseSingleImage(): Promise<File | null> {
  if (!canUseNativeImageSource()) return null;
  try {
    const image = await camera.pickImage({
      quality: "high",
      correctOrientation: true,
    });
    return image.file;
  } catch (error) {
    if (isCancelledError(error)) return null;
    throw error;
  }
}
