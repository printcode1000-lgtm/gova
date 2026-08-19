import {
  ACCOUNT_DELETION_IMAGE_RETRY_DEFAULTS,
  type DeletionImageCleanupResult,
  type FailedDeletionImage,
} from '../domain/account-deletion-registry';
import type { DeletionImage, ImageDeletionPort } from '../ports/account-deletion.port';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function deleteImagesWithRetry(
  images: DeletionImage[],
  storage: ImageDeletionPort,
  options: { maxAttempts?: number; delayMs?: number } = {},
): Promise<DeletionImageCleanupResult> {
  const maxAttempts = options.maxAttempts ?? ACCOUNT_DELETION_IMAGE_RETRY_DEFAULTS.maxAttempts;
  const delayMs = options.delayMs ?? ACCOUNT_DELETION_IMAGE_RETRY_DEFAULTS.delayMs;

  const unique = [
    ...new Map(images.map((image) => [`${image.profileId}:${image.key}`, image])).values(),
  ];

  const failed: FailedDeletionImage[] = [];
  let deleted = 0;

  for (const image of unique) {
    let lastError = 'unknown';
    let succeeded = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await storage.deleteImage(image.profileId, image.key);
        deleted += 1;
        succeeded = true;
        break;
      } catch (error) {
        lastError = errorMessage(error);
        if (attempt < maxAttempts) {
          await sleep(delayMs * attempt);
        }
      }
    }

    if (!succeeded) {
      failed.push({
        profileId: image.profileId,
        key: image.key,
        attempts: maxAttempts,
        error: lastError,
      });
    }
  }

  return {
    attempted: unique.length,
    deleted,
    failed,
  };
}
