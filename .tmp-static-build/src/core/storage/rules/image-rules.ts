import type { StorageProfileClientView } from '../types/storage-profile.types';

/** Validates image byte size against a storage profile limit. */
export function validateImageSizeBytes(sizeBytes: number, maxImageSizeKB: number): void {
  const maxBytes = maxImageSizeKB * 1024;
  if (sizeBytes > maxBytes) {
    throw new Error(`Image exceeds maximum size of ${maxImageSizeKB}KB`);
  }
}

/** Validates that a file is an image accepted for upload. */
export function validateImageMimeType(mimeType: string): void {
  if (!mimeType.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }
}

/** Validates image against profile limits (size only — type checked separately). */
export function validateImageForProfile(
  sizeBytes: number,
  profile: StorageProfileClientView
): void {
  validateImageSizeBytes(sizeBytes, profile.maxImageSizeKB);
}
