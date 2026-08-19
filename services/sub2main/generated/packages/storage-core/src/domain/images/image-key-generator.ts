import type { StorageOutputFormat } from '../profiles/storage-profile.types';

function generateUUID(): string {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
    return `${generateUUID()}.${outputFormat}`;
  }
}

export const imageKeyGenerator = new ImageKeyGenerator();
