import { randomUUID } from 'crypto';
import type { StorageOutputFormat } from '../types/storage-profile.types';

/**
 * Single source of truth for image key generation.
 * Change generation strategy here only — never scatter UUID calls across the codebase.
 */
export class ImageKeyGenerator {
  /** Generates a unique object key. Folder comes from the storage profile. */
  generate(outputFormat: StorageOutputFormat): string {
    if (!outputFormat) {
      throw new Error('ImageKeyGenerator.generate requires outputFormat from Storage Profile');
    }
    return `${randomUUID()}.${outputFormat}`;
  }
}

export const imageKeyGenerator = new ImageKeyGenerator();
