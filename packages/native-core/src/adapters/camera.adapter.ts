import { Camera, CameraDirection, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem } from "@capacitor/filesystem";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError, NativeCoreError, isCancelledError, isPermissionDeniedError } from "../errors/native-core-error";
import { isNativePlatform } from "./platform.adapter";
import { permissionsAdapter } from "./permissions.adapter";
import { base64ToBytes, blobToBase64, detectImageFormat, mimeForImageFormat, stripDataUrlPrefix } from "../domain/binary/binary";
import type { CameraImage, PhotoOptions, PickImagesOptions } from "../domain/camera/types";

const MODULE = "Camera";

const cameraPlugin = createLazyPlugin(MODULE, async () => {
  return Camera;
});

const QUALITY_MAP: Record<string, number> = {
  low: 25,
  medium: 60,
  high: 90,
};

function resolveQuality(q?: string | number): number {
  if (typeof q === "number") return q;
  if (typeof q === "string" && QUALITY_MAP[q] !== undefined) return QUALITY_MAP[q];
  return 90;
}

export const cameraAdapter = {
  async takePhoto(options: PhotoOptions = {}): Promise<CameraImage> {
    try {
      const plugin = await cameraPlugin.required();
      const image = await plugin.getPhoto({
        quality: resolveQuality(options.quality),
        allowEditing: options.allowEditing ?? false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        direction: options.direction === "front" ? CameraDirection.Front : CameraDirection.Rear,
        correctOrientation: options.correctOrientation ?? true,
        saveToGallery: options.saveToGallery ?? false,
      });

      if (!image.base64String) {
        throw NativeCoreError.internal(MODULE, "Camera returned empty image data");
      }

      const bytes = base64ToBytes(image.base64String);
      const format = detectImageFormat(bytes) || image.format || "jpeg";
      const mimeType = mimeForImageFormat(format as any) || `image/${format}`;
      const file = new File([bytes], `photo_${Date.now()}.${format}`, { type: mimeType });

      return {
        file,
        format,
        width: (image as any).width,
        height: (image as any).height,
        webPath: image.webPath,
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async pickImages(options: PickImagesOptions = {}): Promise<CameraImage[]> {
    try {
      const plugin = await cameraPlugin.required();
      const photos = await plugin.pickImages({
        quality: resolveQuality(options.quality),
        limit: options.limit,
        correctOrientation: options.correctOrientation ?? true,
      });

      if (!photos.photos || photos.photos.length === 0) {
        throw NativeCoreError.cancelled(MODULE);
      }

      const images: CameraImage[] = [];
      for (const p of photos.photos) {
        if (p.path) {
          const fileData = await Filesystem.readFile({ path: p.path });
          const raw = typeof fileData.data === "string" ? fileData.data : await blobToBase64(fileData.data);
          const bytes = base64ToBytes(raw);
          const format = detectImageFormat(bytes) || p.format || "jpeg";
          const mimeType = mimeForImageFormat(format as any) || `image/${format}`;
          const file = new File([bytes], `pick_${Date.now()}.${format}`, { type: mimeType });
          images.push({ file, format, webPath: p.webPath });
        } else if (p.webPath) {
          const res = await fetch(p.webPath);
          const blob = await res.blob();
          const format = p.format || "jpeg";
          const file = new File([blob], `pick_${Date.now()}.${format}`, { type: blob.type || `image/${format}` });
          images.push({ file, format, webPath: p.webPath });
        }
      }

      return images;
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};

export function canUseNativeImageSource(_source?: "camera" | "photos"): boolean {
  return isNativePlatform();
}

export async function captureSingleImage(options: PhotoOptions = {}): Promise<CameraImage | null> {
  try {
    return await cameraAdapter.takePhoto(options);
  } catch (error) {
    if (isCancelledError(error)) return null;
    throw error;
  }
}

export async function chooseSingleImage(options: PickImagesOptions = {}): Promise<CameraImage | null> {
  try {
    const images = await cameraAdapter.pickImages({ ...options, limit: 1 });
    return images[0] ?? null;
  } catch (error) {
    if (isCancelledError(error)) return null;
    throw error;
  }
}

export function isImageSourcePermissionDenied(error: unknown): boolean {
  return isPermissionDeniedError(error);
}

export function imageSourcePermissionRequiresSettings(error: unknown): boolean {
  return isPermissionDeniedError(error);
}

export async function openImageSourceSettings(): Promise<boolean> {
  return await permissionsAdapter.openSettings();
}
