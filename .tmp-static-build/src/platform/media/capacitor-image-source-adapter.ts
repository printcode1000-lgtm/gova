import {
  Camera,
  CameraDirection,
  CameraErrorCode,
  EncodingType,
  MediaTypeSelection,
  type MediaResult,
} from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";

const CANCELLED_ERROR_CODES = new Set<string>([
  CameraErrorCode.TakePhotoCancelled,
  CameraErrorCode.ChooseMediaCancelled,
]);

interface CameraPluginError extends Error {
  code?: string;
}

export function canUseNativeImageSource(): boolean {
  return Capacitor.isNativePlatform();
}

export async function captureSingleImage(): Promise<File | null> {
  if (!canUseNativeImageSource()) return null;

  try {
    const result = await Camera.takePhoto({
      cameraDirection: CameraDirection.Rear,
      correctOrientation: true,
      editable: "no",
      encodingType: EncodingType.JPEG,
      includeMetadata: true,
      quality: 92,
      saveToGallery: false,
    });
    return mediaResultToFile(result, "camera");
  } catch (error) {
    if (isCancelled(error)) return null;
    throw error;
  }
}

export async function chooseSingleImage(): Promise<File | null> {
  if (!canUseNativeImageSource()) return null;

  try {
    const { results } = await Camera.chooseFromGallery({
      allowMultipleSelection: false,
      correctOrientation: true,
      editable: "no",
      includeMetadata: true,
      mediaType: MediaTypeSelection.Photo,
      quality: 100,
    });
    const result = results[0];
    return result ? mediaResultToFile(result, "gallery") : null;
  } catch (error) {
    if (isCancelled(error)) return null;
    throw error;
  }
}

async function mediaResultToFile(
  result: MediaResult,
  source: "camera" | "gallery",
): Promise<File> {
  const base64 = await readFullImageBase64(result);
  let bytes = decodeBase64(base64);
  let format = detectImageFormat(bytes);
  let usedThumbnailFallback = false;

  if (!format && result.thumbnail) {
    const thumbnailBytes = decodeBase64(result.thumbnail);
    const thumbnailFormat = detectImageFormat(thumbnailBytes);
    if (thumbnailFormat) {
      bytes = thumbnailBytes;
      format = thumbnailFormat;
      usedThumbnailFallback = true;
    }
  }

  if (!format) {
    const declaredFormat = result.metadata?.format || "unknown";
    throw new Error(
      `The selected image bytes are not a supported JPEG, PNG, WebP, GIF, or HEIC file. Device format: ${declaredFormat}`,
    );
  }

  const mimeType = format === "jpg" ? "image/jpeg" : `image/${format}`;
  const extension = format;
  console.info("[StorageImageManager:native] media-converted-to-file", {
    source,
    declaredFormat: result.metadata?.format ?? null,
    detectedFormat: format,
    bytes: bytes.byteLength,
    usedThumbnailFallback,
  });
  return new File([bytes], `${source}-${Date.now()}.${extension}`, {
    type: mimeType,
  });
}

async function readFullImageBase64(result: MediaResult): Promise<string> {
  if (result.uri) {
    const file = await Filesystem.readFile({ path: result.uri });
    if (typeof file.data === "string") return stripDataUrlPrefix(file.data);
    return blobToBase64(file.data);
  }

  if (result.thumbnail) return stripDataUrlPrefix(result.thumbnail);
  throw new Error("The selected image did not include readable image data.");
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(stripDataUrlPrefix(value));
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error("Unable to read the selected image."));
    reader.onload = () =>
      resolve(stripDataUrlPrefix(String(reader.result ?? "")));
    reader.readAsDataURL(blob);
  });
}

function stripDataUrlPrefix(value: string): string {
  const commaIndex = value.indexOf(",");
  return value.startsWith("data:") && commaIndex >= 0
    ? value.slice(commaIndex + 1)
    : value;
}

function detectImageFormat(
  buffer: ArrayBuffer,
): "jpg" | "png" | "webp" | "gif" | "heic" | null {
  const bytes = new Uint8Array(buffer);
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  if (
    bytes.length >= 6 &&
    String.fromCharCode(...bytes.slice(0, 6)).startsWith("GIF8")
  ) {
    return "gif";
  }
  if (bytes.length >= 12) {
    const box = String.fromCharCode(...bytes.slice(4, 12)).toLowerCase();
    if (
      box.startsWith("ftypheic") ||
      box.startsWith("ftypheix") ||
      box.startsWith("ftyphevc") ||
      box.startsWith("ftyphevx") ||
      box.startsWith("ftypmif1") ||
      box.startsWith("ftypmsf1")
    ) {
      return "heic";
    }
  }
  return null;
}

function isCancelled(error: unknown): boolean {
  return (
    error instanceof Error &&
    typeof (error as CameraPluginError).code === "string" &&
    CANCELLED_ERROR_CODES.has((error as CameraPluginError).code as string)
  );
}
