import type { GooglePlayImageType } from "./store-assets-types";

export interface ImageDimensions { width: number; height: number }
export interface ImageValidationInput {
  imageType: GooglePlayImageType;
  contentType: string;
  size: number;
  dimensions: ImageDimensions;
  existingCount?: number;
  bytes?: Uint8Array;
}
export interface ImageValidationResult { ok: boolean; message?: string }

const screenshotTypes = new Set<GooglePlayImageType>(["phoneScreenshots", "sevenInchScreenshots", "tenInchScreenshots", "tvScreenshots", "wearScreenshots"]);
const MB = 1024 * 1024;

export function detectImageContentType(bytes: Uint8Array): "image/png" | "image/jpeg" | null {
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

export function validateGooglePlayImage(input: ImageValidationInput): ImageValidationResult {
  if (!["image/png", "image/jpeg"].includes(input.contentType)) return reject("releaseConsole.errors.imageType");
  if (input.bytes && detectImageContentType(input.bytes) !== input.contentType) return reject("releaseConsole.errors.imageContentMismatch");
  const { width, height } = input.dimensions;
  if (input.imageType === "icon") {
    if (input.contentType !== "image/png") return reject("releaseConsole.errors.iconPng");
    if (width !== 512 || height !== 512) return reject("releaseConsole.errors.iconDimensions");
    if (input.size > MB) return reject("releaseConsole.errors.iconSize");
  }
  if (input.imageType === "featureGraphic") {
    if (width !== 1024 || height !== 500) return reject("releaseConsole.errors.featureDimensions");
    if (input.size > 15 * MB) return reject("releaseConsole.errors.featureSize");
  }
  if (input.imageType === "tvBanner") {
    if (width !== 1280 || height !== 720) return reject("releaseConsole.errors.tvBannerDimensions");
    if (input.size > 15 * MB) return reject("releaseConsole.errors.tvBannerSize");
  }
  if (screenshotTypes.has(input.imageType)) {
    if (input.existingCount !== undefined && input.existingCount >= 8) return reject("releaseConsole.errors.screenshotCount");
    if (input.size > 8 * MB) return reject("releaseConsole.errors.screenshotSize");
    if (width < 320 || width > 3840 || height < 320 || height > 3840) return reject("releaseConsole.errors.screenshotDimensions");
    if (Math.max(width, height) / Math.min(width, height) > 2) return reject("releaseConsole.errors.screenshotRatio");
  }
  return { ok: true };
}

export function readImageDimensions(buffer: Buffer): ImageDimensions | null {
  try {
    const actualType = detectImageContentType(buffer);
    if (actualType === "image/png") {
      if (buffer.length < 24) return null;
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (actualType !== "image/jpeg") return null;
    let offset = 2;
    while (offset < buffer.length) {
      while (offset < buffer.length && buffer[offset] !== 0xff) offset += 1;
      while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
      if (offset >= buffer.length) return null;
      const marker = buffer[offset++]!;
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > buffer.length) return null;
      const segmentLength = buffer.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > buffer.length) return null;
      const isSof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
      if (isSof) {
        if (segmentLength < 7 || offset + 7 > buffer.length) return null;
        return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
      }
      offset += segmentLength;
    }
  } catch { return null; }
  return null;
}

function reject(message: string): ImageValidationResult { return { ok: false, message }; }
