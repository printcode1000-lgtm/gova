'use client';

import { validateImageForProfile, validateImageMimeType } from '@/core/storage/rules/image-rules';
import type { StorageProfileClientView } from '@/core/storage/types/storage-profile.types';

const WEBP_MIME = 'image/webp';
const MIN_QUALITY = 0.1;
const QUALITY_STEP = 0.05;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function canvasToWebPBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode WebP'));
          return;
        }
        resolve(blob);
      },
      WEBP_MIME,
      quality
    );
  });
}

/**
 * Compresses an image to WebP using Canvas until it satisfies maxImageSizeKB.
 * Does not resize dimensions unless compression alone cannot reach the target.
 */
export async function compressImageToWebP(
  file: File,
  profile: StorageProfileClientView
): Promise<Blob> {
  validateImageMimeType(file.type);

  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0);

  let quality = 0.92;
  let blob = await canvasToWebPBlob(canvas, quality);
  validateImageForProfile(blob.size, profile);

  while (blob.size > profile.maxImageSizeKB * 1024 && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    blob = await canvasToWebPBlob(canvas, quality);
  }

  if (blob.size > profile.maxImageSizeKB * 1024) {
    throw new Error(`Unable to compress image below ${profile.maxImageSizeKB}KB`);
  }

  return blob;
}
