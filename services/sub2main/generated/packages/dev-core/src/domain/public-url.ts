import { LOCAL_SYNC_FILE_PUBLIC_PREFIX } from "./paths";

export function buildLocalSyncFilePublicUrl(
  objectPath: string,
  basePath = "",
): string {
  const normalizedBase = basePath.replace(/\/$/, "");
  const normalizedObjectPath = objectPath.replace(/^\/+/, "");
  return `${normalizedBase}${LOCAL_SYNC_FILE_PUBLIC_PREFIX}/${normalizedObjectPath}`;
}
