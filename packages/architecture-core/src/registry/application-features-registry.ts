/**
 * Canonical application-feature registry.
 *
 * Every top-level directory under `src/features/` MUST appear here. A feature
 * that exists on disk without a registry entry — or a registry entry that points
 * at a missing folder — fails `architecture:check`. Cross-feature imports are
 * allowed only through declared doors, and only toward features listed in
 * `permittedDependencies`.
 *
 * SOURCE OF TRUTH for application features. Reference docs under
 * `docs/01-architecture/08-reference/` are generated from this registry.
 */

export type FeatureDoor = '.' | './ui' | './server';

export type FeatureRuntimeTarget = 'web' | 'android' | 'ios' | 'server' | 'service';

export interface ApplicationFeature {
  /** Directory name under `src/features/`. */
  name: string;
  /** Repository-relative source root. */
  sourcePath: string;
  /** One-line ownership / purpose statement. */
  owns: string;
  /** Declared public doors (mirrors package `exports` idea). */
  doors: readonly FeatureDoor[];
  /** Runtimes this feature participates in. */
  runtimeTargets: readonly FeatureRuntimeTarget[];
  /** Associated sealed `@asol/*` capability owners. */
  capabilityOwners: readonly string[];
  /** Other application features this one may import (by door only). */
  permittedDependencies: readonly string[];
  /**
   * Justified deep-import seams into other features (rare). Used when a
   * feature must not import another feature's public door to avoid cycles
   * (e.g. notifications → auth internals). Empty for almost every feature.
   */
  deepImportSeams: readonly string[];
  /** Whether browser/client surfaces exist. */
  hasBrowser: boolean;
  /** Whether server-only surfaces exist. */
  hasServer: boolean;
  /** Whether UI/presentation surfaces exist. */
  hasUi: boolean;
}

/**
 * Approved top-level directories under `src/`. Anything else fails the scan.
 * Framework-required root files (`instrumentation.ts`, `proxy.ts`, …) are files, not directories.
 */
export const APPROVED_SRC_ROOTS = ['app', 'core', 'features', 'shared'] as const;

/**
 * Canonical feature vocabulary for internal folders. Features may use a subset.
 * Competing aliases (`entities`, top-level `components`) are rejected.
 */
export const FEATURE_INTERNAL_VOCABULARY = [
  'domain',
  'application',
  'infrastructure',
  'presentation',
  'ports',
  'server',
  'tests',
  'hooks',
  'services',
  'utils',
  'config',
  'public',
  'shared',
  'runtime',
  'context',
  'processing',
  'validation',
  'types',
] as const;

/** Forbidden competing application-module roots. */
export const FORBIDDEN_APP_ROOTS = ['modules', 'components', 'hooks', 'lib', 'theme', 'locales'] as const;

export const APPLICATION_FEATURES: readonly ApplicationFeature[] = [
  {
    name: 'account-bridge',
    sourcePath: 'src/features/account-bridge',
    owns: 'Application wiring for cross-account notification identity bridging',
    doors: [
      '.'
    ],
    runtimeTargets: [
      'web'
    ],
    capabilityOwners: [
      '@asol/account-bridge'
    ],
    permittedDependencies: [],
    deepImportSeams: [],
    hasBrowser: false,
    hasServer: false,
    hasUi: false
  },
  {
    name: 'advertisements',
    sourcePath: 'src/features/advertisements',
    owns: 'Home advertisements surfaces (hero slider, featured marquee, trending ribbon)',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/hero-slider-core',
      '@asol/featured-marquee-core',
      '@asol/trending-ribbon-core'
    ],
    permittedDependencies: ['auth', 'product', 'product-card', 'profile', 'storage'],
    deepImportSeams: ['profile'],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'app-reset',
    sourcePath: 'src/features/app-reset',
    owns: 'Client application reset orchestration',
    doors: [
      '.'
    ],
    runtimeTargets: [
      'web'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'notifications'
    ],
    deepImportSeams: [],
    hasBrowser: false,
    hasServer: false,
    hasUi: false
  },
  {
    name: 'auth',
    sourcePath: 'src/features/auth',
    owns: 'Authentication, session, registration, and account deletion UI/services',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/auth-core'
    ],
    permittedDependencies: [
      'app-reset',
      'notifications',
      'page-save',
      'profile',
      'storage',
      'system-logs'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'cart',
    sourcePath: 'src/features/cart',
    owns: 'Shopping cart client and server orchestration',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'auth',
      'notifications',
      'profile',
      'seller-discounts'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'catalog-studio',
    sourcePath: 'src/features/catalog-studio',
    owns: 'Developer catalog studio editing surfaces',
    doors: [
      '.',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/catalog-core'
    ],
    permittedDependencies: [
      'auth',
      'page-save'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'categories',
    sourcePath: 'src/features/categories',
    owns: 'Category browsing and seller discovery presentation',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/catalog-core'
    ],
    permittedDependencies: [
      'profile',
      'seller-card'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'contact',
    sourcePath: 'src/features/contact',
    owns: 'Contact actions and seller contact orchestration',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [],
    permittedDependencies: [],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'data',
    sourcePath: 'src/features/data',
    owns: 'Data-core application port wiring',
    doors: ['.', './server'],
    runtimeTargets: [
      'web'
    ],
    capabilityOwners: [
      '@asol/data-core'
    ],
    permittedDependencies: [
      'categories'
    ],
    deepImportSeams: [],
    hasBrowser: false,
    hasServer: false,
    hasUi: false
  },
  {
    name: 'data-health',
    sourcePath: 'src/features/data-health',
    owns: 'Development data-health inspection and cleanup UI',
    doors: [
      '.',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/data-health-core',
      '@asol/data-core'
    ],
    permittedDependencies: [
      'auth',
      'page-save',
      'system-logs'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'dev-cloud-backup',
    sourcePath: 'src/features/dev-cloud-backup',
    owns: 'Development Turso cloud backup console',
    doors: [
      '.',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/backup-core',
      '@asol/data-core'
    ],
    permittedDependencies: [
      'auth',
      'page-save'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'dev-tools',
    sourcePath: 'src/features/dev-tools',
    owns: 'Developer-only tooling pages',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [
      '@asol/dev-core'
    ],
    permittedDependencies: [
      'page-save',
      'pharmacy-profile-catalog',
      'product'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'favorites',
    sourcePath: 'src/features/favorites',
    owns: 'Favorites list and adapters',
    doors: [
      '.'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'auth',
      'product-card',
      'seller-card',
      'system-logs'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'feature-flags',
    sourcePath: 'src/features/feature-flags',
    owns: 'Feature flag evaluation wiring',
    doors: [
      '.',
      './server'
    ],
    runtimeTargets: [
      'web',
      'server'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'auth'
    ],
    deepImportSeams: [],
    hasBrowser: false,
    hasServer: true,
    hasUi: false
  },
  {
    name: 'follow',
    sourcePath: 'src/features/follow',
    owns: 'Follow/unfollow seller relationships',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'auth',
      'notifications'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'google-play-console',
    sourcePath: 'src/features/google-play-console',
    owns: 'Release console, deploy runbook, and Play Store assets UI',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/google-play-store-assets-core',
      '@asol/release-core',
      '@asol/ota-core'
    ],
    permittedDependencies: [
      'auth',
      'page-save',
      'release-commands'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'home',
    sourcePath: 'src/features/home',
    owns: 'Home screen composition',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'advertisements',
      'categories'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'location',
    sourcePath: 'src/features/location',
    owns: 'Location capture and map-related application surfaces',
    doors: [
      '.'
    ],
    runtimeTargets: [
      'web'
    ],
    capabilityOwners: [
      '@asol/map-core'
    ],
    permittedDependencies: [],
    deepImportSeams: [],
    hasBrowser: false,
    hasServer: false,
    hasUi: false
  },
  {
    name: 'navigation',
    sourcePath: 'src/features/navigation',
    owns: 'In-app navigation helpers',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [],
    permittedDependencies: [],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'network',
    sourcePath: 'src/features/network',
    owns: 'Network status UI and hooks',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'system-logs'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'notifications',
    sourcePath: 'src/features/notifications',
    owns: 'Notification behaviour, UI, and server orchestration',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/notifications-core'
    ],
    permittedDependencies: [
      'auth',
      'orders',
      'specialty-chat'
    ],
    deepImportSeams: ['auth', 'orders', 'specialty-chat'],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'onboarding',
    sourcePath: 'src/features/onboarding',
    owns: 'Merchant onboarding wizard',
    doors: [
      '.'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'page-save',
      'storage'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'orders',
    sourcePath: 'src/features/orders',
    owns: 'Orders presentation and server orchestration',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/orders-core'
    ],
    permittedDependencies: [
      'auth',
      'cart',
      'notifications',
      'profile',
      'system-logs'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'ota',
    sourcePath: 'src/features/ota',
    owns: 'OTA application wiring and server surfaces',
    doors: [
      '.',
      './server'
    ],
    runtimeTargets: [
      'web',
      'server'
    ],
    capabilityOwners: [
      '@asol/ota-core'
    ],
    permittedDependencies: [
      'auth',
      'categories',
      'system-logs'
    ],
    deepImportSeams: [],
    hasBrowser: false,
    hasServer: true,
    hasUi: false
  },
  {
    name: 'page-save',
    sourcePath: 'src/features/page-save',
    owns: 'Page-save gateway application wiring and hooks',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [
      '@asol/page-save-core'
    ],
    permittedDependencies: [
      'onboarding',
      'storage'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'page-snapshot',
    sourcePath: 'src/features/page-snapshot',
    owns: 'Page snapshot application wiring',
    doors: [
      '.'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [
      '@asol/page-snapshot-core'
    ],
    permittedDependencies: [
      'auth'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'password-recovery',
    sourcePath: 'src/features/password-recovery',
    owns: 'Password recovery flows',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'auth'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'pharmacy-profile-catalog',
    sourcePath: 'src/features/pharmacy-profile-catalog',
    owns: 'Pharmacy profile catalog editing',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'auth',
      'page-save',
      'product'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'product',
    sourcePath: 'src/features/product',
    owns: 'Product detail, style editors, and product services',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/product-core',
      '@asol/product-style-core'
    ],
    permittedDependencies: [
      'auth',
      'cart',
      'categories',
      'favorites',
      'page-save',
      'pharmacy-profile-catalog',
      'product-card',
      'profile',
      'sharing',
      'specialty-chat',
      'storage',
      'system-logs'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'product-card',
    sourcePath: 'src/features/product-card',
    owns: 'Product card view-model and presentation',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'favorites',
      'product'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'product-search',
    sourcePath: 'src/features/product-search',
    owns: 'Product search panel and page',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'categories',
      'product',
      'product-card',
      'profile',
      'seller-card',
      'storage'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'profile',
    sourcePath: 'src/features/profile',
    owns: 'Seller/user profile surfaces',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'advertisements',
      'auth',
      'categories',
      'follow',
      'location',
      'page-save',
      'page-snapshot',
      'product',
      'profile-products',
      'profile-working-hours',
      'seller-card',
      'seller-discounts',
      'sharing',
      'specialty-chat',
      'system-logs'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'profile-products',
    sourcePath: 'src/features/profile-products',
    owns: 'Profile products tabs presentation',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'categories',
      'page-snapshot',
      'product',
      'product-card',
      'product-search',
      'profile'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'profile-working-hours',
    sourcePath: 'src/features/profile-working-hours',
    owns: 'Working hours card presentation',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [],
    permittedDependencies: [],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'qr-code',
    sourcePath: 'src/features/qr-code',
    owns: 'QR code generation helpers',
    doors: [
      '.'
    ],
    runtimeTargets: [
      'web'
    ],
    capabilityOwners: [],
    permittedDependencies: [],
    deepImportSeams: [],
    hasBrowser: false,
    hasServer: false,
    hasUi: false
  },
  {
    name: 'release-commands',
    sourcePath: 'src/features/release-commands',
    owns: 'Release build-job client and server wiring',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/release-core'
    ],
    permittedDependencies: ['google-play-console'],
    deepImportSeams: ['google-play-console'],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'seller-card',
    sourcePath: 'src/features/seller-card',
    owns: 'Seller card view-model and presentation',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'favorites',
      'profile'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'seller-discounts',
    sourcePath: 'src/features/seller-discounts',
    owns: 'Seller discount rules UI and services',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'cart',
      'profile'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'settings',
    sourcePath: 'src/features/settings',
    owns: 'Settings screens',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'auth',
      'notifications'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'sharing',
    sourcePath: 'src/features/sharing',
    owns: 'Native/web sharing orchestration',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'server'
    ],
    capabilityOwners: [
      '@asol/native-core'
    ],
    permittedDependencies: [
      'product',
      'profile',
      'qr-code',
      'system-logs'
    ],
    deepImportSeams: [],
    hasBrowser: false,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'specialty-chat',
    sourcePath: 'src/features/specialty-chat',
    owns: 'Specialty chat surfaces',
    doors: [
      '.',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'auth',
      'categories',
      'notifications',
      'product',
      'profile'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'splash',
    sourcePath: 'src/features/splash',
    owns: 'Splash screen',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'auth',
      'categories'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  },
  {
    name: 'storage',
    sourcePath: 'src/features/storage',
    owns: 'Storage upload application wiring and UI',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/storage-core',
      '@asol/storage-image-manager-core'
    ],
    permittedDependencies: [
      'auth'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'super-admin',
    sourcePath: 'src/features/super-admin',
    owns: 'Super-admin operational UI',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [],
    permittedDependencies: [
      'advertisements',
      'auth',
      'notifications',
      'page-save',
      'product',
      'storage',
      'system-logs'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'system-logs',
    sourcePath: 'src/features/system-logs',
    owns: 'System logs collector wiring and admin UI',
    doors: [
      '.',
      './ui',
      './server'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios',
      'server'
    ],
    capabilityOwners: [
      '@asol/system-logs-core'
    ],
    permittedDependencies: [
      'auth',
      'page-save'
    ],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: true,
    hasUi: true
  },
  {
    name: 'vehicle-catalog',
    sourcePath: 'src/features/vehicle-catalog',
    owns: 'Vehicle catalog helpers',
    doors: [
      '.'
    ],
    runtimeTargets: [
      'web'
    ],
    capabilityOwners: [],
    permittedDependencies: [],
    deepImportSeams: [],
    hasBrowser: false,
    hasServer: false,
    hasUi: false
  },
  {
    name: 'voice-input',
    sourcePath: 'src/features/voice-input',
    owns: 'Voice input UI helpers',
    doors: [
      '.',
      './ui'
    ],
    runtimeTargets: [
      'web',
      'android',
      'ios'
    ],
    capabilityOwners: [],
    permittedDependencies: [],
    deepImportSeams: [],
    hasBrowser: true,
    hasServer: false,
    hasUi: true
  }
] as const;

export function featureByName(name: string): ApplicationFeature | undefined {
  return APPLICATION_FEATURES.find((f) => f.name === name);
}

export function featureDoorSpecifiers(feature: ApplicationFeature): readonly string[] {
  return feature.doors.map((door) =>
    door === '.' ? `@/features/${feature.name}` : `@/features/${feature.name}/${door.slice(2)}`,
  );
}

export function isFeatureDoorSpecifier(specifier: string): { feature: string; door: FeatureDoor } | null {
  const m = specifier.match(/^@\/features\/([^/]+)(?:\/(ui|server))?$/);
  if (!m) return null;
  const feature = m[1]!;
  const door: FeatureDoor = m[2] === 'ui' ? './ui' : m[2] === 'server' ? './server' : '.';
  const entry = featureByName(feature);
  if (!entry) return null;
  if (!entry.doors.includes(door)) return null;
  return { feature, door };
}
