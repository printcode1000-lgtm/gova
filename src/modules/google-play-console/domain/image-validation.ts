import type { GooglePlayImageType } from "./store-assets-types";

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageValidationInput {
  imageType: GooglePlayImageType;
  contentType: string;
  size: number;
  dimensions: ImageDimensions;
  existingCount?: number;
}

export interface ImageValidationResult {
  ok: boolean;
  message?: string;
}

const screenshotTypes = new Set<GooglePlayImageType>([
  "phoneScreenshots",
  "sevenInchScreenshots",
  "tenInchScreenshots",
]);

export function validateGooglePlayImage(input: ImageValidationInput): ImageValidationResult {
  if (!["image/png", "image/jpeg"].includes(input.contentType)) {
    return reject(`نوع الملف ${input.contentType || "غير معروف"} غير مقبول / File type must be PNG or JPEG.`);
  }
  const { width, height } = input.dimensions;
  if (input.imageType === "icon") {
    if (input.contentType !== "image/png") return reject("الأيقونة يجب أن تكون PNG / Icon must be PNG.");
    if (width !== 512 || height !== 512) return reject(`الأيقونة ${width}x${height}، المطلوب 512x512 / Icon must be 512x512.`);
    if (input.size > 1024 * 1024) return reject(`حجم الأيقونة ${Math.ceil(input.size / 1024)}KB، الحد 1024KB / Icon max size is 1024KB.`);
  }
  if (input.imageType === "featureGraphic" && (width !== 1024 || height !== 500)) {
    return reject(`الصورة الترويجية ${width}x${height}، المطلوب 1024x500 / Feature graphic must be 1024x500.`);
  }
  if (screenshotTypes.has(input.imageType)) {
    if (input.existingCount !== undefined && input.existingCount >= 8) {
      return reject(`تم الوصول إلى 8 صور لهذا النوع / Maximum 8 screenshots for this type.`);
    }
    if (width < 320 || width > 3840 || height < 320 || height > 3840) {
      return reject(`أبعاد اللقطة ${width}x${height} خارج نطاق 320-3840 / Screenshot sides must be 320-3840px.`);
    }
    const ratio = Math.max(width, height) / Math.min(width, height);
    if (ratio > 2) return reject(`نسبة اللقطة ${ratio.toFixed(2)}:1، الحد 2:1 / Screenshot ratio must be at most 2:1.`);
  }
  return { ok: true };
}

export function readImageDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}

function reject(message: string): ImageValidationResult {
  return { ok: false, message };
}
