"use client";

import {
  validateImageForProfile,
  validateImageMimeType,
} from "@/core/storage/rules/image-rules";
import { getMimeTypeForOutputFormat } from "@/core/storage/output-format.registry";
import type { StorageProfileClientView } from "@/core/storage/types/storage-profile.types";

const INITIAL_QUALITY = 0.86;
const MIN_QUALITY = 0.1;
const QUALITY_STEP = 0.06;
const RESIZE_STEP = 0.85;
const MIN_LONG_EDGE_PX = 160;

function getInitialLongEdgeLimit(maxImageSizeKB: number): number {
  if (maxImageSizeKB <= 20) return 512;
  if (maxImageSizeKB <= 30) return 768;
  if (maxImageSizeKB <= 100) return 1280;
  return 1600;
}

function getScaledDimensions(
  width: number,
  height: number,
  maxLongEdge: number,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function drawImageToCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    console.info("[StorageImageManager:processor] file-read-start", {
      name: file.name,
      type: file.type,
      size: file.size,
    });
    const reader = new FileReader();
    const img = new Image();
    img.onload = () => {
      console.info("[StorageImageManager:processor] image-decoded", {
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      resolve(img);
    };
    img.onerror = () => {
      console.error("[StorageImageManager:processor] image-decode-failed");
      reject(new Error("Failed to load image"));
    };
    reader.onerror = () => {
      console.error(
        "[StorageImageManager:processor] file-read-failed",
        reader.error,
      );
      reject(reader.error ?? new Error("Unable to read selected image"));
    };
    reader.onload = () => {
      console.info("[StorageImageManager:processor] file-read-completed");
      img.src = String(reader.result ?? "");
    };
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Failed to encode ${mimeType}`));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

/**
 * Client Image Processing Layer — compresses to profile.outputFormat via registry.
 *
 * The profile byte limits are intentionally preserved. For very small limits
 * such as 20–30KB, compression must reduce both quality and dimensions; quality
 * alone is not reliable for detailed camera photos.
 */
export async function compressImageForProfile(
  file: File,
  profile: StorageProfileClientView,
): Promise<Blob> {
  console.info("[StorageImageManager:processor] compression-start", {
    profileId: profile.id,
    outputFormat: profile.outputFormat,
    maxImageSizeKB: profile.maxImageSizeKB,
  });
  if (!profile.enabled) {
    throw new Error(`Storage profile is disabled: ${profile.id}`);
  }

  validateImageMimeType(file.type);
  const mimeType = getMimeTypeForOutputFormat(profile.outputFormat);
  const maxBytes = profile.maxImageSizeKB * 1024;

  const img = await loadImageFromFile(file);
  let longEdgeLimit = getInitialLongEdgeLimit(profile.maxImageSizeKB);
  let bestBlob: Blob | null = null;

  while (longEdgeLimit >= MIN_LONG_EDGE_PX) {
    const dimensions = getScaledDimensions(
      img.naturalWidth,
      img.naturalHeight,
      longEdgeLimit,
    );
    const canvas = drawImageToCanvas(img, dimensions.width, dimensions.height);

    for (
      let quality = INITIAL_QUALITY;
      quality >= MIN_QUALITY;
      quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP)
    ) {
      const blob = await canvasToBlob(canvas, mimeType, quality);
      bestBlob = !bestBlob || blob.size < bestBlob.size ? blob : bestBlob;

      if (blob.size <= maxBytes) {
        console.info("[StorageImageManager:processor] compression-completed", {
          outputBytes: blob.size,
          width: dimensions.width,
          height: dimensions.height,
          quality,
        });
        validateImageForProfile(blob.size, profile);
        return blob;
      }

      if (quality === MIN_QUALITY) break;
    }

    longEdgeLimit = Math.floor(longEdgeLimit * RESIZE_STEP);
  }

  if (bestBlob && bestBlob.size <= maxBytes) {
    validateImageForProfile(bestBlob.size, profile);
    return bestBlob;
  }

  throw new Error(
    `Unable to compress image below ${profile.maxImageSizeKB}KB. Please choose a simpler or lower-resolution image.`,
  );
}
