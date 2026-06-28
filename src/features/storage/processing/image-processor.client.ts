'use client';

import { validateImageForProfile, validateImageMimeType } from '@/core/storage/rules/image-rules';
import { getMimeTypeForOutputFormat } from '@/core/storage/output-format.registry';
import type { StorageProfileClientView } from '@/core/storage/types/storage-profile.types';

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

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
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
      quality
    );
  });
}

/**
 * Client Image Processing Layer — compresses to profile.outputFormat via registry.
 */
export async function compressImageForProfile(
  file: File,
  profile: StorageProfileClientView
): Promise<Blob> {
  if (!profile.enabled) {
    throw new Error(`Storage profile is disabled: ${profile.id}`);
  }

  validateImageMimeType(file.type);
  const mimeType = getMimeTypeForOutputFormat(profile.outputFormat);

  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0);

  let quality = 0.92;
  let blob = await canvasToBlob(canvas, mimeType, quality);
  validateImageForProfile(blob.size, profile);

  while (blob.size > profile.maxImageSizeKB * 1024 && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  if (blob.size > profile.maxImageSizeKB * 1024) {
    throw new Error(`Unable to compress image below ${profile.maxImageSizeKB}KB`);
  }

  return blob;
}
