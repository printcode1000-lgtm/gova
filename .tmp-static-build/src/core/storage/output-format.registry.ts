import type { StorageOutputFormat } from './types/storage-profile.types';

/** Allowed output formats — must match storage-profiles.json validation. */
export const ALLOWED_OUTPUT_FORMATS: readonly StorageOutputFormat[] = ['webp'] as const;

const MIME_BY_FORMAT: Record<StorageOutputFormat, string> = {
  webp: 'image/webp',
};

/** Resolves MIME type for a profile output format (single registry — no hardcoding elsewhere). */
export function getMimeTypeForOutputFormat(format: StorageOutputFormat): string {
  const mime = MIME_BY_FORMAT[format];
  if (!mime) {
    throw new Error(`No MIME mapping for output format: ${format}`);
  }
  return mime;
}

/** Builds upload filename from profile output format. */
export function buildUploadFilename(format: StorageOutputFormat): string {
  return `image.${format}`;
}

/** Returns true when format is registered in ALLOWED_OUTPUT_FORMATS. */
export function isAllowedOutputFormat(value: string): value is StorageOutputFormat {
  return (ALLOWED_OUTPUT_FORMATS as readonly string[]).includes(value);
}
