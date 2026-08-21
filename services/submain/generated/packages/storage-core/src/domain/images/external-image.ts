const UNOPTIMIZED_HOSTS = [
  'googleusercontent.com',
  'r2.dev',
  'cloudflarestorage.com',
];

/** Matches `@asol/dev-core` `LOCAL_SYNC_FILE_PUBLIC_PREFIX` without importing that package here. */
const LOCAL_SYNC_FILE_PUBLIC_PREFIX = '/sync_data/sync_file';

/** Some sources reject or never reach the Next.js optimizer. */
export function shouldUseUnoptimizedImage(src: string): boolean {
  if (!src) return false;
  if (src.startsWith('blob:') || src.startsWith('data:')) return true;
  if (
    src === LOCAL_SYNC_FILE_PUBLIC_PREFIX ||
    src.startsWith(`${LOCAL_SYNC_FILE_PUBLIC_PREFIX}/`) ||
    src.includes(`${LOCAL_SYNC_FILE_PUBLIC_PREFIX}/`)
  ) {
    return true;
  }

  if (!src.startsWith('http://') && !src.startsWith('https://')) return false;

  try {
    const { hostname } = new URL(src);
    return UNOPTIMIZED_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}
