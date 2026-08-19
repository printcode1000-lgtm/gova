import type { StorageProfile } from '../../domain/profiles/storage-profile.types';
import { getMimeTypeForOutputFormat } from '../../domain/images/output-format.registry';
import { validateImageForProfile, validateImageSizeBytes } from '../../domain/images/image-rules';

/** Server-side Image Rules + Processing verification (no re-encode — validates processed payload). */
export function assertProcessedImageMatchesProfile(
  body: Buffer,
  contentType: string,
  profile: StorageProfile,
): void {
  const expectedMime = getMimeTypeForOutputFormat(profile.outputFormat);
  if (contentType !== expectedMime) {
    throw new Error(
      `Content-Type "${contentType}" does not match profile outputFormat "${profile.outputFormat}"`,
    );
  }

  validateImageSizeBytes(body.length, profile.maxImageSizeKB);
  validateImageForProfile(body.length, profile);
}
