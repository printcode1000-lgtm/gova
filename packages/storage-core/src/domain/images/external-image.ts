const UNOPTIMIZED_HOSTS = [
  'googleusercontent.com',
  'r2.dev',
  'cloudflarestorage.com',
];

/** Some external storage/CDN hosts reject or intermittently fail Next.js optimizer fetches. */
export function shouldUseUnoptimizedImage(src: string): boolean {
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
