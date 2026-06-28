import { randomUUID } from 'crypto';

/** Generates a unique image key (UUID + .webp). Folder is resolved by the storage profile. */
export function generateImageKey(): string {
  return `${randomUUID()}.webp`;
}

/** Combines profile folder and image key into the provider object path. */
export function buildObjectPath(folder: string, imageKey: string): string {
  const normalizedFolder = folder.replace(/^\/+|\/+$/g, '');
  return `${normalizedFolder}/${imageKey}`;
}

/** Parses an image key from a full object path (for delete/replace). */
export function extractImageKeyFromPath(objectPath: string): string {
  const parts = objectPath.split('/');
  return parts[parts.length - 1] ?? objectPath;
}
