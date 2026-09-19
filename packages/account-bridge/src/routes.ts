/** Pure canonical API route+method ownership registry. */
export const BUSINESS_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const;
export type BusinessHttpMethod = (typeof BUSINESS_HTTP_METHODS)[number];
export type ApiOwner = 'control' | 'notifications' | 'products' | 'orders' | 'profiles' | 'submain' | 'sub2main';

export interface RouteOwnership {
  owner: ApiOwner;
  pattern: string;
  methods: readonly BusinessHttpMethod[];
  description: string;
}

const ALL = BUSINESS_HTTP_METHODS;
const READ = ['GET', 'HEAD'] as const;
const WRITE = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

/**
 * Ordered most-specific first. Patterns are pathname-only: query strings and a
 * single trailing slash never alter ownership.
 */
export const ROUTE_OWNERSHIP: readonly RouteOwnership[] = [
  { owner: 'control', pattern: '/api/super-admin/**', methods: ALL, description: 'طلبات أدوات وإجراءات السوبر أدمن.' },
  { owner: 'control', pattern: '/api/system-logs/**', methods: ALL, description: 'قراءة وإدارة سجلات النظام التشغيلية.' },
  { owner: 'control', pattern: '/api/ota/admin/**', methods: ALL, description: 'إدارة إصدارات OTA وأوامرها الإدارية.' },
  // The notifications account owns the whole notification surface, including
  // the session-bound routes: it holds the users database, the session signing
  // secret, and the mobile push unlock key beside its own database for them.
  { owner: 'notifications', pattern: '/api/notifications/**', methods: ALL, description: 'كل مسارات الإشعارات: التسليم وتسجيل الأجهزة والتفضيلات والاختبارات والبث ومرسل الموبايل.' },
  { owner: 'control', pattern: '/api/ota/access', methods: ['POST'], description: 'إصدار قرار وصول OTA من مستودع موافقات التحديثات.' },
  { owner: 'submain', pattern: '/api/account/**', methods: ALL, description: 'إدارة حساب المستخدم وعمليات الحذف المرتبطة به.' },
  { owner: 'submain', pattern: '/api/auth/**', methods: ALL, description: 'تسجيل الدخول والتسجيل والجلسة واسترجاع كلمة المرور.' },
  { owner: 'submain', pattern: '/api/verification/**', methods: ALL, description: 'طلبات تحقق الهاتف ونتائج بوابة الرسائل.' },
  { owner: 'submain', pattern: '/api/contact', methods: ['POST'], description: 'استقبال نموذج التواصل العام.' },
  { owner: 'submain', pattern: '/api/feature-flags', methods: ALL, description: 'قراءة وتعديل أعلام الميزات العامة.' },
  { owner: 'submain', pattern: '/api/advertisements/**', methods: ALL, description: 'إدارة وقراءة إعلانات الصفحة الرئيسية.' },
  { owner: 'submain', pattern: '/api/follow/**', methods: ALL, description: 'قراءة وتحديث علاقات المتابعة.' },
  { owner: 'submain', pattern: '/api/search/**', methods: ALL, description: 'تنفيذ بحث السوق والبائعين والمنتجات.' },
  { owner: 'submain', pattern: '/api/specialty-chat/**', methods: ALL, description: 'تشغيل محادثة التخصص الموقعة.' },
  { owner: 'submain', pattern: '/api/orders/from-cart', methods: ['POST'], description: 'إنشاء طلب سوق من محتوى السلة.' },
  { owner: 'submain', pattern: '/api/orders/custom-request-from-profile', methods: ['POST'], description: 'إنشاء طلب خاص من صفحة البروفايل.' },
  { owner: 'submain', pattern: '/api/orders/[orderId]/**', methods: ALL, description: 'قراءة أو تعديل تفاصيل طلب محدد ومساراته الفرعية.' },
  { owner: 'orders', pattern: '/api/orders', methods: READ, description: 'قراءة قائمة الطلبات العامة من حساب الطلبات.' },
  { owner: 'sub2main', pattern: '/api/storage/**', methods: WRITE, description: 'كتابة أو توقيع عمليات التخزين العامة.' },
  { owner: 'profiles', pattern: '/api/storage/profiles/**', methods: READ, description: 'قراءة وسائط بروفايلات الصيدليات.' },
  { owner: 'sub2main', pattern: '/api/products/reviews/**', methods: WRITE, description: 'كتابة تقييمات المنتجات وردودها.' },
  { owner: 'sub2main', pattern: '/api/products', methods: WRITE, description: 'إنشاء أو تعديل بيانات المنتجات.' },
  { owner: 'products', pattern: '/api/products/**', methods: READ, description: 'قراءة تفاصيل المنتجات ومساراتها الفرعية.' },
  { owner: 'products', pattern: '/api/products', methods: READ, description: 'قراءة قائمة المنتجات.' },
  // Profile reviews read the product database as well as the profile shards, and
  // `asol-profiles` holds no product credentials — the read cannot live with the
  // other profile reads. `asol-sub2main` holds both, so it owns the whole family.
  // Ownership follows the capability; widening an account's secrets to match a
  // routing choice is how least privilege is lost.
  { owner: 'sub2main', pattern: '/api/profile/reviews/**', methods: ALL, description: 'قراءة وكتابة تقييمات البروفايل التي تحتاج بيانات المنتجات والبروفايل.' },
  { owner: 'sub2main', pattern: '/api/profile/reviews', methods: ALL, description: 'قراءة وكتابة قائمة تقييمات البروفايل.' },
  // Inactive discount reads and discount writes require the session-signing capability.
  { owner: 'sub2main', pattern: '/api/profile/discounts', methods: ALL, description: 'قراءة أو تعديل خصومات البروفايل المحمية بالجلسة.' },
  { owner: 'sub2main', pattern: '/api/profile/**', methods: WRITE, description: 'كتابة بيانات البروفايل ومساراته الفرعية.' },
  { owner: 'profiles', pattern: '/api/profile/**', methods: READ, description: 'قراءة بيانات البروفايل ومساراته الفرعية.' },
  { owner: 'sub2main', pattern: '/api/pharmacy-profile-catalog', methods: WRITE, description: 'تعديل كتالوج بروفايلات الصيدليات.' },
  { owner: 'products', pattern: '/api/pharmacy-profile-catalog', methods: READ, description: 'قراءة كتالوج بروفايلات الصيدليات.' },
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
