/** Pure canonical API route+method ownership registry. */
export const BUSINESS_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const;
export type BusinessHttpMethod = (typeof BUSINESS_HTTP_METHODS)[number];
export type ApiOwner = 'control' | 'notifications' | 'products' | 'orders' | 'profiles' | 'submain' | 'sub2main';

export interface RouteOwnership {
  owner: ApiOwner;
  pattern: string;
  methods: readonly BusinessHttpMethod[];
}

const ALL = BUSINESS_HTTP_METHODS;
const READ = ['GET', 'HEAD'] as const;
const WRITE = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

/**
 * Ordered most-specific first. Patterns are pathname-only: query strings and a
 * single trailing slash never alter ownership.
 */
export const ROUTE_OWNERSHIP: readonly RouteOwnership[] = [
  { owner: 'control', pattern: '/api/super-admin/**', methods: ALL },
  { owner: 'control', pattern: '/api/system-logs/**', methods: ALL },
  { owner: 'control', pattern: '/api/ota/admin/**', methods: ALL },
  // Two notification surfaces need a verified session as well as the
  // notifications database, and `asol-notifications` holds only the second.
  // They move to the account that already holds both rather than granting
  // session signing to a push fan-out runtime.
  { owner: 'submain', pattern: '/api/notifications/devices', methods: ALL },
  { owner: 'submain', pattern: '/api/notifications/test/self', methods: ALL },
  { owner: 'notifications', pattern: '/api/notifications/**', methods: ALL },
  { owner: 'submain', pattern: '/api/ota/access', methods: ['POST'] },
  { owner: 'submain', pattern: '/api/account/**', methods: ALL },
  { owner: 'submain', pattern: '/api/auth/**', methods: ALL },
  { owner: 'submain', pattern: '/api/contact', methods: ['POST'] },
  { owner: 'submain', pattern: '/api/feature-flags', methods: ALL },
  { owner: 'submain', pattern: '/api/advertisements/**', methods: ALL },
  { owner: 'submain', pattern: '/api/follow/**', methods: ALL },
  { owner: 'submain', pattern: '/api/search/**', methods: ALL },
  { owner: 'submain', pattern: '/api/specialty-chat/**', methods: ALL },
  { owner: 'submain', pattern: '/api/orders/from-cart', methods: ['POST'] },
  { owner: 'submain', pattern: '/api/orders/custom-request-from-profile', methods: ['POST'] },
  { owner: 'submain', pattern: '/api/orders/[orderId]/**', methods: ALL },
  { owner: 'orders', pattern: '/api/orders', methods: READ },
  { owner: 'sub2main', pattern: '/api/storage/**', methods: WRITE },
  { owner: 'profiles', pattern: '/api/storage/profiles/**', methods: READ },
  { owner: 'sub2main', pattern: '/api/products/reviews/**', methods: WRITE },
  { owner: 'sub2main', pattern: '/api/products', methods: WRITE },
  { owner: 'products', pattern: '/api/products/**', methods: READ },
  { owner: 'products', pattern: '/api/products', methods: READ },
  // Profile reviews read the product database as well as the profile shards, and
  // `asol-profiles` holds no product credentials — the read cannot live with the
  // other profile reads. `asol-sub2main` holds both, so it owns the whole family.
  // Ownership follows the capability; widening an account's secrets to match a
  // routing choice is how least privilege is lost.
  { owner: 'sub2main', pattern: '/api/profile/reviews/**', methods: ALL },
  { owner: 'sub2main', pattern: '/api/profile/reviews', methods: ALL },
  { owner: 'sub2main', pattern: '/api/profile/**', methods: WRITE },
  { owner: 'profiles', pattern: '/api/profile/**', methods: READ },
  { owner: 'sub2main', pattern: '/api/pharmacy-profile-catalog', methods: WRITE },
  { owner: 'products', pattern: '/api/pharmacy-profile-catalog', methods: READ },
];

export function normalizeApiPath(input: string): string {
  const pathname = input.split(/[?#]/, 1)[0] || '/';
  const decoded = pathname.split('/').map((segment) => {
    try { return decodeURIComponent(segment); } catch { return segment; }
  }).join('/');
  return decoded.length > 1 ? decoded.replace(/\/+$/, '') : decoded;
}

function matches(pattern: string, pathname: string): boolean {
  const wildcard = pattern.endsWith('/**');
  const base = wildcard ? pattern.slice(0, -3) : pattern;
  const expression = base.split('/').map((segment) => {
    if (/^\[[^\]]+\]$/.test(segment)) return '[^/]+';
    return segment.replace(/[.*+?^${}()|\\]/g, '\\$&');
  }).join('/');
  return new RegExp(`^${expression}${wildcard ? '(?:/.*)?' : ''}$`).test(pathname);
}

export function resolveRouteOwner(method: string, route: string): ApiOwner | null {
  const normalizedMethod = method.toUpperCase() as BusinessHttpMethod;
  if (!BUSINESS_HTTP_METHODS.includes(normalizedMethod)) return null;
  const pathname = normalizeApiPath(route);
  for (const entry of ROUTE_OWNERSHIP) {
    if (entry.methods.includes(normalizedMethod) && matches(entry.pattern, pathname)) return entry.owner;
  }
  return null;
}

/**
 * Every business method this pathname has an owner for.
 *
 * `OPTIONS` is transport behavior on each receiving origin, not a second
 * business owner, so a preflight has to be answered with the methods the path
 * actually accepts — which may be split across two owners, as `/api/products`
 * is between reads and writes.
 */
export function ownedMethodsForPath(route: string): BusinessHttpMethod[] {
  const pathname = normalizeApiPath(route);
  return BUSINESS_HTTP_METHODS.filter((method) => resolveRouteOwner(method, pathname) !== null);
}

export function isBusinessApiPath(route: string): boolean {
  const path = normalizeApiPath(route);
  return path.startsWith('/api/') && path !== '/api/health' && !path.startsWith('/api/dev/');
}
