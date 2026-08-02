/**
 * Native camera adapter (Android and iOS).
 *
 * Single responsibility: drive `@capacitor/camera` and convert its result
 * into a `CameraImage`. Byte inspection lives in `core/binary`; permission
 * decisions live in the Permission Manager.
 */

import {
  base64ToBytes,
  blobToBase64,
  detectImageFormat,
  mimeForImageFormat,
  stripDataUrlPrefix,
} from "../core/binary";
import { NativePlatformError, toNativeError } from "../core/errors";
import { createLazyPlugin } from "../core/lazy-plugin";
import {
  QUALITY_VALUES,
  type CameraImage,
  type CapturePhotoOptions,
  type PickImageOptions,
} from "./types";

const MODULE = "Camera";

interface MediaMetadata {
  format?: string;
}

interface MediaResult {
  uri?: string;
  thumbnail?: string;
  metadata?: MediaMetadata;
}

interface CameraPluginApi {
  takePhoto: (options: Record<string, unknown>) => Promise<MediaResult>;
  chooseFromGallery: (
    options: Record<string, unknown>,
  ) => Promise<{ results: MediaResult[] }>;
}

interface FilesystemApi {
  readFile: (options: { path: string }) => Promise<{ data: string | Blob }>;
}

const cameraPlugin = createLazyPlugin(MODULE, async () => {
  const plugin = await import("@capacitor/camera");
  return {
    api: plugin.Camera as unknown as CameraPluginApi,
    CameraDirection: plugin.CameraDirection,
    EncodingType: plugin.EncodingType,
    MediaTypeSelection: plugin.MediaTypeSelection,
  };
});

const filesystemPlugin = createLazyPlugin(MODULE, async () => {
  const { Filesystem } = await import("@capacitor/filesystem");
  return Filesystem as unknown as FilesystemApi;
});

/**
 * Read the full-resolution bytes. Capacitor returns a file URI for the real
 * image and a base64 thumbnail; the URI is preferred and the thumbnail is a
 * fallback for devices that omit it.
 */
async function readImageBase64(result: MediaResult): Promise<string> {
  if (result.uri) {
    const filesystem = await filesystemPlugin.required();
    const file = await filesystem.readFile({ path: result.uri });
    if (typeof file.data === "string") return stripDataUrlPrefix(file.data);
    return blobToBase64(file.data);
  }
  if (result.thumbnail) return stripDataUrlPrefix(result.thumbnail);
  throw NativePlatformError.internal(
    MODULE,
    new Error("The selected image did not include readable image data."),
  );
}

async function toCameraImage(
  result: MediaResult,
  source: "camera" | "gallery",
): Promise<CameraImage> {
  let bytes = base64ToBytes(await readImageBase64(result));
  let format = detectImageFormat(bytes);

  // Some devices hand back an unreadable full-size buffer; the thumbnail is
  // still a valid image and is better than failing the whole operation.
  if (!format && result.thumbnail) {
    const thumbnailBytes = base64ToBytes(result.thumbnail);
    const thumbnailFormat = detectImageFormat(thumbnailBytes);
    if (thumbnailFormat) {
      bytes = thumbnailBytes;
      format = thumbnailFormat;
    }
  }

  if (!format) {
    throw NativePlatformError.internal(
      MODULE,
      new Error(
        `Unsupported image bytes. Device reported: ${result.metadata?.format ?? "unknown"}`,
      ),
    );
  }

  const mimeType = mimeForImageFormat(format);
  return {
    file: new File([bytes], `${source}-${Date.now()}.${format}`, {
      type: mimeType,
    }),
    source,
    format,
    mimeType,
    byteSize: bytes.byteLength,
  };
}

export async function nativeCapturePhoto(
  options: CapturePhotoOptions,
): Promise<CameraImage> {
  const plugin = await cameraPlugin.required();
  try {
    const result = await plugin.api.takePhoto({
      cameraDirection:
        options.direction === "front"
          ? plugin.CameraDirection.Front
          : plugin.CameraDirection.Rear,
      correctOrientation: options.correctOrientation ?? true,
      editable: "no",
      encodingType: plugin.EncodingType.JPEG,
      includeMetadata: true,
      quality: QUALITY_VALUES[options.quality ?? "high"],
      saveToGallery: options.saveToGallery ?? false,
    });
    return await toCameraImage(result, "camera");
  } catch (error) {
    throw toNativeError(MODULE, error);
  }
}

export async function nativePickImages(
  options: PickImageOptions,
): Promise<CameraImage[]> {
  const plugin = await cameraPlugin.required();
  try {
    const { results } = await plugin.api.chooseFromGallery({
      allowMultipleSelection: options.multiple ?? false,
      correctOrientation: options.correctOrientation ?? true,
      editable: "no",
      includeMetadata: true,
      mediaType: plugin.MediaTypeSelection.Photo,
      quality: QUALITY_VALUES[options.quality ?? "high"],
      ...(options.limit ? { limit: options.limit } : {}),
    });

    const selected = options.multiple ? results : results.slice(0, 1);
    if (selected.length === 0) throw NativePlatformError.cancelled(MODULE);

    return await Promise.all(
      selected.map((result) => toCameraImage(result, "gallery")),
    );
  } catch (error) {
    throw toNativeError(MODULE, error);
  }
}
