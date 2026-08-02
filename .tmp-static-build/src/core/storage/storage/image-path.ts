import { STORAGE_IMAGES_ROOT } from "../constants/storage-profiles";

/** Ensures object paths always live under images/ (never directly under sync_file root). */
export function assertPathUnderImagesRoot(objectPath: string): void {
  const normalized = objectPath.replace(/^\/+|\/+$/g, "");
  if (!normalized.startsWith(`${STORAGE_IMAGES_ROOT}/`)) {
    throw new Error(
      `Object path must start with "${STORAGE_IMAGES_ROOT}/": ${objectPath}`,
    );
  }
}

/** Combines profile folder and image key into the provider object path. */
export function buildObjectPath(folder: string, imageKey: string): string {
  const normalizedFolder = folder.replace(/^\/+|\/+$/g, "");
  if (
    !imageKey ||
    imageKey.startsWith("/") ||
    imageKey.includes("\\") ||
    imageKey
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid image key: ${imageKey}`);
  }
  const objectPath = `${normalizedFolder}/${imageKey}`;
  assertPathUnderImagesRoot(objectPath);
  return objectPath;
}

/** Parses an image key from a full object path (for delete/replace). */
export function extractImageKeyFromPath(objectPath: string): string {
  const parts = objectPath.split("/");
  return parts[parts.length - 1] ?? objectPath;
}
