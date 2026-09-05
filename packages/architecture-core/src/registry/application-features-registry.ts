/**
 * Canonical application-feature registry.
 *
 * Every top-level directory under `src/features/` MUST appear here. A feature
 * that exists on disk without a registry entry — or a registry entry that points
 * at a missing folder — fails `architecture:check`. Cross-feature imports are
 * allowed only through declared Public API doors and declared
 * `permittedDependencies` edges.
 */

export type FeatureDoor = '.' | './ui' | './server' | './session' | './ports';
export type FeatureRuntimeTarget = 'web' | 'android' | 'ios' | 'server' | 'service';

export interface ApplicationFeature {
  name: string;
  sourcePath: string;
  owns: string;
  doors: readonly FeatureDoor[];
  runtimeTargets: readonly FeatureRuntimeTarget[];
  capabilityOwners: readonly string[];
  permittedDependencies: readonly string[];
  hasBrowser: boolean;
  hasServer: boolean;
  hasUi: boolean;
}

export const APPROVED_SRC_ROOTS = ['app', 'core', 'features', 'shared'] as const;

/**
 * Canonical feature-internal top-level vocabulary. No compatibility or legacy
 * buckets are recognized: new roots fail closed in architecture:check.
 */
export const FEATURE_INTERNAL_VOCABULARY = [
  'domain',
  'application',
  'infrastructure',
  'presentation',
  'ports',
  'server',
  'tests',
] as const;

export const FORBIDDEN_APP_ROOTS = ['modules', 'components', 'hooks', 'lib', 'theme', 'locales'] as const;

type SurfaceFlags = readonly [browser: boolean, server: boolean, ui: boolean];

function feature(
  name: string,
  owns: string,
  doors: readonly FeatureDoor[],
  runtimeTargets: readonly FeatureRuntimeTarget[],
  capabilityOwners: readonly string[] = [],
  permittedDependencies: readonly string[] = [],
  surfaces: SurfaceFlags = [false, false, false],
): ApplicationFeature {
  return {
    name,
    sourcePath: `src/features/${name}`,
    owns,
    doors,
    runtimeTargets,
    capabilityOwners,
    permittedDependencies,
    hasBrowser: surfaces[0],
    hasServer: surfaces[1],
    hasUi: surfaces[2],
  };
}

const WEB = ['web'] as const;
const WEB_MOBILE = ['web', 'android', 'ios'] as const;
const WEB_MOBILE_SERVER = ['web', 'android', 'ios', 'server'] as const;
const WEB_SERVER = ['web', 'server'] as const;
const FULL: SurfaceFlags = [true, true, true];
const CLIENT_UI: SurfaceFlags = [true, false, true];

export const APPLICATION_FEATURES: readonly ApplicationFeature[] = [
  feature('account-bridge', 'Application wiring for cross-account notification identity bridging', ['.'], WEB, ['@asol/account-bridge'], ['notifications']),
  feature('advertisements', 'Home advertisements surfaces (hero slider, featured marquee, trending ribbon)', ['.', './ui', './server'], WEB_MOBILE_SERVER, ['@asol/hero-slider-core', '@asol/featured-marquee-core', '@asol/trending-ribbon-core', '@asol/auth-core', '@asol/product-card-core'], ['product', 'storage'], FULL),
  feature('app-reset', 'Client application reset orchestration', ['.'], WEB, [], ['notifications']),
  feature('auth', 'Authentication, session, registration, and account deletion UI/services', ['.', './ui', './server', './session'], WEB_MOBILE_SERVER, ['@asol/auth-core', '@asol/data-core'], ['app-reset', 'notifications', 'page-save', 'storage', 'system-logs'], FULL),
  feature('cart', 'Shopping cart client and server orchestration', ['.', './ui', './server'], WEB_MOBILE_SERVER, ['@asol/product-core'], ['notifications', 'seller-discounts'], FULL),
  feature('catalog-studio', 'Developer catalog studio editing surfaces', ['.', './server'], WEB_MOBILE_SERVER, ['@asol/catalog-core'], ['auth', 'page-save'], FULL),
  feature('categories', 'Category browsing and seller discovery presentation', ['.', './ui'], WEB_MOBILE_SERVER, ['@asol/catalog-core', '@asol/seller-card-core'], ['favorites', 'profile'], FULL),
  feature('contact', 'Contact actions and seller contact orchestration', ['.', './ui', './server'], WEB_MOBILE_SERVER, [], [], FULL),
  feature('data', 'Data-core application port wiring', ['.', './server'], WEB, ['@asol/data-core'], ['categories', 'product-search']),
  feature('data-health', 'Development data-health inspection and cleanup UI', ['.', './server'], WEB_MOBILE_SERVER, ['@asol/data-health-core', '@asol/data-core'], ['auth', 'page-save', 'system-logs'], FULL),
  feature('dev-cloud-backup', 'Development Turso cloud backup console', ['.', './server'], WEB_MOBILE_SERVER, ['@asol/backup-core', '@asol/data-core'], ['auth', 'page-save'], FULL),
  feature('dev-tools', 'Developer-only tooling pages', ['.', './ui'], WEB_MOBILE, ['@asol/dev-core'], ['categories', 'page-save', 'pharmacy-profile-catalog', 'product'], CLIENT_UI),
  feature('favorites', 'Application wiring and host slots for @asol/favorites-core', ['./ui'], WEB_MOBILE, ['@asol/favorites-core', '@asol/product-card-core', '@asol/seller-card-core'], ['auth', 'follow', 'system-logs'], CLIENT_UI),
  feature('feature-flags', 'Feature flag evaluation wiring', ['.', './server'], WEB_SERVER, [], ['auth'], [false, true, false]),
  feature('follow', 'Follow/unfollow seller relationships', ['.', './ui', './server'], WEB_MOBILE_SERVER, [], ['auth', 'notifications'], FULL),
  feature('google-play-console', 'Release console, deploy runbook, and Play Store assets UI', ['.', './ui', './server'], WEB_MOBILE_SERVER, ['@asol/google-play-store-assets-core', '@asol/release-core', '@asol/ota-core'], ['auth', 'page-save', 'release-commands'], FULL),
  feature('home', 'Home screen composition', ['.', './ui'], WEB_MOBILE, [], ['advertisements', 'categories'], CLIENT_UI),
  feature('location', 'Location capture and map-related application surfaces', ['.'], WEB, ['@asol/map-core']),
  feature('navigation', 'In-app navigation helpers', ['.', './ui'], WEB_MOBILE, [], [], CLIENT_UI),
  feature('network', 'Network status UI and hooks', ['.', './ui'], WEB_MOBILE, [], ['system-logs'], CLIENT_UI),
  feature('notifications', 'Notification behaviour, UI, and server orchestration', ['.', './ui', './server'], WEB_MOBILE_SERVER, ['@asol/notifications-core'], [], FULL),
  feature('onboarding', 'Merchant onboarding wizard', ['.'], WEB_MOBILE, [], ['page-save', 'storage'], CLIENT_UI),
  feature('orders', 'Orders presentation and server orchestration', ['.', './ui', './server'], WEB_MOBILE_SERVER, ['@asol/orders-core'], ['auth', 'cart', 'notifications', 'profile', 'system-logs'], FULL),
  feature('ota', 'OTA application wiring and server surfaces', ['.', './server'], WEB_SERVER, ['@asol/ota-core'], ['auth', 'categories', 'super-admin', 'system-logs'], [false, true, false]),
  feature('page-save', 'Page-save gateway application wiring and hooks', ['.', './ui'], WEB_MOBILE, ['@asol/page-save-core'], ['onboarding', 'storage'], CLIENT_UI),
  feature('page-snapshot', 'Page snapshot application wiring', ['.', './ports'], WEB_MOBILE, ['@asol/page-snapshot-core'], [], CLIENT_UI),
  feature('password-recovery', 'Password recovery flows', ['.', './ui', './server'], WEB_MOBILE_SERVER, [], ['auth'], FULL),
  feature('pharmacy-profile-catalog', 'Pharmacy profile catalog editing', ['.', './ui', './server'], WEB_MOBILE_SERVER, ['@asol/product-core'], ['page-save', 'product'], FULL),
  feature('product', 'Product detail, style editors, and product services', ['.', './ui', './server'], WEB_MOBILE_SERVER, ['@asol/product-core', '@asol/product-style-core', '@asol/product-card-core', '@asol/favorites-core'], ['cart', 'categories', 'location', 'page-save', 'sharing', 'specialty-chat', 'storage', 'system-logs', 'vehicle-catalog'], FULL),
  feature('product-search', 'Product search panel and page', ['.', './ui', './server'], WEB_MOBILE_SERVER, ['@asol/product-card-core', '@asol/seller-card-core'], ['categories', 'favorites', 'product', 'profile', 'storage'], FULL),
  feature('profile', 'Seller/user profile surfaces', ['.', './ui', './server'], WEB_MOBILE_SERVER, ['@asol/seller-card-core'], ['advertisements', 'auth', 'categories', 'follow', 'location', 'page-save', 'page-snapshot', 'product', 'profile-products', 'profile-working-hours', 'seller-discounts', 'sharing', 'specialty-chat', 'storage', 'system-logs'], FULL),
  feature('profile-products', 'Profile products tabs presentation', ['.', './ui'], WEB_MOBILE, ['@asol/product-core', '@asol/product-card-core', '@asol/data-core'], ['categories', 'favorites', 'page-snapshot', 'pharmacy-profile-catalog', 'product', 'product-search'], CLIENT_UI),
  feature('profile-working-hours', 'Working hours card presentation', ['.', './ui'], WEB_MOBILE, [], [], CLIENT_UI),
  feature('qr-code', 'QR code generation helpers', ['.'], WEB),
  feature('release-commands', 'Release build-job and production deploy orchestration', ['.', './ui', './server'], WEB_MOBILE_SERVER, ['@asol/notifications-core', '@asol/release-core', '@asol/vercel-deploy-core'], ['auth', 'google-play-console'], FULL),
  feature('seller-discounts', 'Seller discount rules UI and services', ['.', './ui', './server'], WEB_MOBILE_SERVER, [], ['cart', 'profile'], FULL),
  feature('settings', 'Settings screens', ['.', './ui'], WEB_MOBILE, [], ['app-reset', 'auth', 'notifications', 'specialty-chat'], CLIENT_UI),
  feature('sharing', 'Native/web sharing orchestration', ['.', './ui', './server'], WEB_SERVER, ['@asol/native-core'], ['product', 'profile', 'qr-code', 'system-logs'], [false, true, true]),
  feature('specialty-chat', 'Specialty chat surfaces', ['.', './server'], WEB_MOBILE_SERVER, [], ['auth', 'categories', 'notifications', 'product', 'profile'], FULL),
  feature('splash', 'Splash screen', ['.', './ui'], WEB_MOBILE, [], ['auth', 'categories'], CLIENT_UI),
  feature('storage', 'Storage upload application wiring and UI', ['.', './ui', './server'], WEB_MOBILE_SERVER, ['@asol/storage-core', '@asol/storage-image-manager-core'], ['auth'], FULL),
  feature('super-admin', 'Super-admin operational UI', ['.', './ui', './server'], WEB_MOBILE_SERVER, [], ['advertisements', 'auth', 'notifications', 'page-save', 'product', 'storage', 'system-logs'], FULL),
  feature('system-logs', 'System logs collector wiring and admin UI', ['.', './ui', './server'], WEB_MOBILE_SERVER, ['@asol/system-logs-core'], ['auth', 'page-save'], FULL),
  feature('vehicle-catalog', 'Vehicle catalog helpers', ['.'], WEB),
  feature('voice-input', 'Voice input UI helpers', ['.', './ui'], WEB_MOBILE, [], [], CLIENT_UI),
] as const;

export function featureByName(name: string): ApplicationFeature | undefined {
  return APPLICATION_FEATURES.find((feature) => feature.name === name);
}

export function featureDoorSpecifiers(feature: ApplicationFeature): readonly string[] {
  return feature.doors.map((door) =>
    door === '.' ? `@/features/${feature.name}` : `@/features/${feature.name}/${door.slice(2)}`,
  );
}

export function isFeatureDoorSpecifier(specifier: string): { feature: string; door: FeatureDoor } | null {
  const match = specifier.match(/^@\/features\/([^/]+)(?:\/(ui|server|session|ports))?$/);
  if (!match) return null;
  const feature = match[1]!;
  const rest = match[2];
  const door: FeatureDoor =
    rest === 'ui'
      ? './ui'
      : rest === 'server'
        ? './server'
        : rest === 'session'
          ? './session'
          : rest === 'ports'
            ? './ports'
            : '.';
  const entry = featureByName(feature);
  if (!entry || !entry.doors.includes(door)) return null;
  return { feature, door };
}
