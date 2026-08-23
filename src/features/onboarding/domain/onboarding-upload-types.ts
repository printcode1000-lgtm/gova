import type { StoredImage } from '@asol/storage-core';

/** Legacy blob-preview upload shape (collections, verification — out of storage profile scope). */
export interface UploadedImage extends Omit<StoredImage, 'imageKey'> {
  imageKey?: string;
  id?: string;
  preview?: string;
}
