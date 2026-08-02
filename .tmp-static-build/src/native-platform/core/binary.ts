/**
 * Binary conversion helpers shared by Camera, Files, and Share.
 *
 * Single responsibility: move bytes between base64, `ArrayBuffer`, `Blob`, and
 * `File` without any module re-implementing the conversions.
 */

export function stripDataUrlPrefix(value: string): string {
  const commaIndex = value.indexOf(",");
  return value.startsWith("data:") && commaIndex >= 0
    ? value.slice(commaIndex + 1)
    : value;
}

/**
 * Returns a view backed by a plain `ArrayBuffer` (not `SharedArrayBuffer`),
 * which is what `Blob`/`File` constructors require.
 */
export function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(stripDataUrlPrefix(value));
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error("Unable to read binary data."));
    reader.onload = () =>
      resolve(stripDataUrlPrefix(String(reader.result ?? "")));
    reader.readAsDataURL(blob);
  });
}

export function base64ToFile(
  value: string,
  fileName: string,
  mimeType: string,
): File {
  return new File([base64ToBytes(value)], fileName, { type: mimeType });
}

/** Detected image container, used to pick a correct MIME type and extension. */
export type ImageFormat = "jpg" | "png" | "webp" | "gif" | "heic";

const FORMAT_MIME: Record<ImageFormat, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
};

export function mimeForImageFormat(format: ImageFormat): string {
  return FORMAT_MIME[format];
}

/**
 * Identify an image by magic bytes rather than by the extension or the
 * format string the device reports, which is unreliable on Android and iOS.
 */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
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
