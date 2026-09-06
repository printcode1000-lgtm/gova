export type AsolApiLocalReadPolicy =
  | 'localFirst'
  | 'volatile'
  | 'static'
  | 'networkAuthoritative';

export interface AsolApiLocalReadRequest<T> {
  cacheKey: string;
  policy: AsolApiLocalReadPolicy;
  load: () => Promise<T>;
}

export interface AsolApiBrowserLocalReadCache {
  read: <T>(request: AsolApiLocalReadRequest<T>) => Promise<T>;
  invalidateAll: () => Promise<void>;
}

let browserCache: AsolApiBrowserLocalReadCache | null = null;

export function configureAsolApiBrowserLocalReadCache(
  cache: AsolApiBrowserLocalReadCache,
): void {
  browserCache = cache;
}

export function resetAsolApiBrowserLocalReadCacheForTests(): void {
  browserCache = null;
}

export async function readAsolApiLocalFirst<T>(
  request: AsolApiLocalReadRequest<T>,
): Promise<T> {
  if (typeof window === 'undefined') return request.load();
  if (!browserCache) {
    throw new Error('AsolApi browser local-read cache is not configured');
  }
  return browserCache.read(request);
}

export async function invalidateAsolApiLocalReads(): Promise<void> {
  if (typeof window === 'undefined' || !browserCache) return;
  await browserCache.invalidateAll();
}

function routePath(route: string): string {
  if (/^https?:\/\//i.test(route)) {
    try {
      return new URL(route).pathname;
    } catch {
      return route;
    }
  }
  return route.split('?', 1)[0] || route;
}

/** Conservative freshness defaults; callers may override explicitly. */
export function defaultAsolApiLocalReadPolicy(route: string): AsolApiLocalReadPolicy {
  if (/^https?:\/\//i.test(route)) return 'networkAuthoritative';
  const path = routePath(route);
  if (
    path === '/api/health' ||
    path.startsWith('/api/dev/') ||
    path.startsWith('/api/super-admin/') ||
    path.startsWith('/api/system-logs') ||
    path === '/api/auth/check-phone' ||
    path.startsWith('/api/notifications/')
  ) {
    return 'networkAuthoritative';
  }
  if (
    path.startsWith('/api/orders') ||
    path.startsWith('/api/follow') ||
    path.startsWith('/api/specialty-chat') ||
    path.includes('/reviews') ||
    path === '/api/feature-flags'
  ) {
    return 'volatile';
  }
  return 'localFirst';
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Header values are hashed so auth/session material never appears in persisted query keys. */
export function buildAsolApiLocalReadCacheKey(
  route: string,
  headers: Record<string, string> | undefined,
): string {
  const headerFingerprint = Object.entries(headers ?? {})
    .map(([key, value]) => [key.toLowerCase(), value] as const)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join('\\n');
  return `GET:${route}#${fnv1a(headerFingerprint)}`;
}
