import type { StorageProfile } from '../types/storage-profile.types';
import { getMimeTypeForOutputFormat } from '../output-format.registry';
import { validateImageForProfile, validateImageSizeBytes } from '../rules/image-rules';

/** Server-side Image Rules + Processing verification (no re-encode — validates processed payload). */
export function assertProcessedImageMatchesProfile(
  body: Buffer,
  contentType: string,
  profile: StorageProfile
): void {
  const expectedMime = getMimeTypeForOutputFormat(profile.outputFormat);
  if (contentType !== expectedMime) {
    throw new Error(
      `Content-Type "${contentType}" does not match profile outputFormat "${profile.outputFormat}"`
    );
  }

  validateImageSizeBytes(body.length, profile.maxImageSizeKB);
  validateImageForProfile(body.length, profile);
}
