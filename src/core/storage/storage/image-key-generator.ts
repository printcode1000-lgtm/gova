import { randomUUID } from 'crypto';
import type { StorageOutputFormat } from '../types/storage-profile.types';

/**
 * Single source of truth for image key generation.
 * Change generation strategy here only — never scatter UUID calls across the codebase.
 */
export class ImageKeyGenerator {
  /** Generates a unique object key (e.g. `{uuid}.webp`). Folder comes from the storage profile. */
  generate(outputFormat: StorageOutputFormat = 'webp'): string {
    return `${randomUUID()}.${outputFormat}`;
  }
}

export const imageKeyGenerator = new ImageKeyGenerator();
