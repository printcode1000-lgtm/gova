/**
 * Repository-wide capability ownership registry.
 *
 * Every sealed `@asol/*` package is listed here with the capability it owns, its
 * architectural layer, and the vendor modules it alone may import. New packages
 * must be registered before `architecture:check` will accept them. Composition
 * packages may reach into the application (`@/`); capability packages must not.
 */

export type PackageLayer =
  | 'capability'
  | 'composition'
  | 'declarations'
  | 'bridge'
  | 'enforcement';

export interface CapabilityPackage {
  /** Directory under `packages/`. */
  folder: string;
  /** npm package name. */
  name: string;
  /** One-line ownership statement. */
  owns: string;
  layer: PackageLayer;
  /**
   * Vendor / SDK modules this package alone may import.
   * Empty means no third-party infrastructure SDK is owned here.
   */
  vendorModules: readonly string[];
  /**
   * Whether production source under this package may import `@/…`.
   * Only composition and (narrowly) bridge packages may.
   */
  mayImportApp: boolean;
}

/**
 * Canonical inventory. Keep in sync with each packages/<name>/package.json.
 * The ownership contract fails if a package exists on disk but is missing here,
 * or if a registry entry points at a missing folder.
 */
export const CAPABILITY_PACKAGES: readonly CapabilityPackage[] = [
  {
    folder: 'architecture-core',
    name: '@asol/architecture-core',
    owns: 'Repository architecture contracts and static enforcement',
    layer: 'enforcement',
    /**
     * No owned vendor. The compiler API this package parses with is toolchain,
     * not infrastructure: importing it grants access to no capability, and the
     * refactor codemods under `scripts/refactor/` use it too. Modelling it as
     * owned would claim exclusivity over the language's own parser.
     */
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'account-declarations',
    name: '@asol/account-declarations',
    owns: 'Deployment account declarations and routing metadata',
    layer: 'declarations',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'account-bridge',
    name: '@asol/account-bridge',
    owns: 'Cross-account notification and identity bridging',
    layer: 'bridge',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'auth-core',
    name: '@asol/auth-core',
    owns: 'Authentication and session identity',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'backup-core',
    name: '@asol/backup-core',
    owns: 'Backup orchestration over storage ports',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'branding-core',
    name: '@asol/branding-core',
    owns: 'App icon identity and generated branding assets',
    layer: 'capability',
    vendorModules: ['sharp'],
    mayImportApp: false,
  },
  {
    folder: 'catalog-core',
    name: '@asol/catalog-core',
    owns: 'Category catalog domain',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'data-core',
    name: '@asol/data-core',
    owns: 'Database access, sharding, and domain repositories',
    layer: 'capability',
    vendorModules: [
      'better-sqlite3',
      '@libsql/client',
      'drizzle-orm',
      'drizzle-orm/better-sqlite3',
      'drizzle-orm/libsql',
    ],
    mayImportApp: false,
  },
  {
    folder: 'data-health-core',
    name: '@asol/data-health-core',
    owns: 'Schema health and data integrity checks',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'dev-core',
    name: '@asol/dev-core',
    owns: 'Developer-only tooling surfaces',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'env-core',
    name: '@asol/env-core',
    owns: 'Environment variable reading rules',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'featured-marquee-core',
    name: '@asol/featured-marquee-core',
    owns: 'Featured marquee UI capability',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'format-core',
    name: '@asol/format-core',
    owns: 'Formatting helpers with a single owner',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'google-play-store-assets-core',
    name: '@asol/google-play-store-assets-core',
    owns: 'Google Play store listing image assets',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'hero-slider-core',
    name: '@asol/hero-slider-core',
    owns: 'Hero slider UI capability',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'map-core',
    name: '@asol/map-core',
    owns: 'MapLibre map capability',
    layer: 'capability',
    vendorModules: ['maplibre-gl'],
    mayImportApp: false,
  },
  {
    folder: 'native-core',
    name: '@asol/native-core',
    owns: 'Capacitor / native device capabilities',
    layer: 'capability',
    vendorModules: [
      '@capacitor/cli',
      '@capacitor/core',
      '@capacitor/action-sheet',
      '@capacitor/app',
      '@capacitor/browser',
      '@capacitor/camera',
      '@capacitor/clipboard',
      '@capacitor/device',
      '@capacitor/dialog',
      '@capacitor/filesystem',
      '@capacitor/geolocation',
      '@capacitor/haptics',
      '@capacitor/keyboard',
      '@capacitor/local-notifications',
      '@capacitor/network',
      '@capacitor/preferences',
      '@capacitor/push-notifications',
      '@capacitor/screen-orientation',
      '@capacitor/share',
      '@capacitor/splash-screen',
      '@capacitor/status-bar',
      '@capacitor/text-zoom',
      '@capacitor/toast',
      '@capacitor-mlkit/barcode-scanning',
      '@capawesome/capacitor-file-picker',
      '@capgo/capacitor-speech-recognition',
    ],
    mayImportApp: false,
  },
  {
    folder: 'notifications-core',
    name: '@asol/notifications-core',
    owns: 'Push notification delivery (Web Push, FCM HTTP v1, APNs)',
    layer: 'capability',
    // FCM uses HTTP v1 + google-auth-library; firebase-admin is not a production path.
    vendorModules: ['web-push', 'google-auth-library'],
    mayImportApp: false,
  },
  {
    folder: 'notifications-composition',
    name: '@asol/notifications-composition',
    owns: 'Composition root for the notifications account',
    layer: 'composition',
    vendorModules: [],
    mayImportApp: true,
  },
  {
    folder: 'observability-core',
    name: '@asol/observability-core',
    owns: 'Observability and telemetry ports',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'orders-core',
    name: '@asol/orders-core',
    owns: 'Order domain meaning and policies',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'orders-composition',
    name: '@asol/orders-composition',
    owns: 'Composition root for the orders account',
    layer: 'composition',
    vendorModules: [],
    mayImportApp: true,
  },
  {
    folder: 'ota-core',
    name: '@asol/ota-core',
    owns: 'OTA publishing and update runtime',
    layer: 'capability',
    vendorModules: ['@aws-sdk/client-s3', 'google-auth-library'],
    mayImportApp: false,
  },
  {
    folder: 'page-save-core',
    name: '@asol/page-save-core',
    owns: 'Mandatory gateway for page-authored persistence',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'page-snapshot-core',
    name: '@asol/page-snapshot-core',
    owns: 'Page snapshot capture and restore',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'product-core',
    name: '@asol/product-core',
    owns: 'Product domain logic',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'product-style-core',
    name: '@asol/product-style-core',
    owns: 'Product presentation style rules',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'products-composition',
    name: '@asol/products-composition',
    owns: 'Composition root for the products account',
    layer: 'composition',
    vendorModules: [],
    mayImportApp: true,
  },
  {
    folder: 'profiles-composition',
    name: '@asol/profiles-composition',
    owns: 'Composition root for the profiles account',
    layer: 'composition',
    vendorModules: [],
    mayImportApp: true,
  },
  {
    folder: 'release-core',
    name: '@asol/release-core',
    owns: 'Release console and runbooks',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'secrets-core',
    name: '@asol/secrets-core',
    owns: 'Secrets archive backup and restore',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'service-mirror-core',
    name: '@asol/service-mirror-core',
    owns: 'Service source mirroring into services/*',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'service-runtime-core',
    name: '@asol/service-runtime-core',
    owns: 'Shared service runtime helpers',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'signed-token-core',
    name: '@asol/signed-token-core',
    owns: 'Signed token create/verify',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'storage-core',
    name: '@asol/storage-core',
    owns: 'Object storage (R2/S3) access',
    layer: 'capability',
    vendorModules: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
    mayImportApp: false,
  },
  {
    folder: 'storage-image-manager-core',
    name: '@asol/storage-image-manager-core',
    owns: 'Image manager UI and client lifecycle over storage ports',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'sub2main-composition',
    name: '@asol/sub2main-composition',
    owns: 'Composition root for the sub2main account',
    layer: 'composition',
    vendorModules: [],
    mayImportApp: true,
  },
  {
    folder: 'submain-composition',
    name: '@asol/submain-composition',
    owns: 'Composition root for the submain account',
    layer: 'composition',
    vendorModules: [],
    mayImportApp: true,
  },
  {
    folder: 'system-logs-core',
    name: '@asol/system-logs-core',
    owns: 'System log capture and persistence contract',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'trending-ribbon-core',
    name: '@asol/trending-ribbon-core',
    owns: 'Trending ribbon UI capability',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
  {
    folder: 'vercel-deploy-core',
    name: '@asol/vercel-deploy-core',
    owns: 'Vercel deployment orchestration',
    layer: 'capability',
    vendorModules: [],
    mayImportApp: false,
  },
] as const;

/**
 * Derived from every package's `vendorModules`. Do not maintain a parallel list —
 * a vendor present only here would be unenforceable against its real owner, and a
 * vendor present only on a package would be invisible to the ownership scan.
 *
 * Dual ownership is intentional where two capabilities share one SDK for distinct
 * jobs (e.g. `@aws-sdk/client-s3` for product media vs OTA artifacts;
 * `google-auth-library` for FCM vs Google Play). Both owners must remain registered.
 */
export const OWNED_VENDOR_MODULES: readonly string[] = (() => {
  const modules = new Set<string>();
  for (const entry of CAPABILITY_PACKAGES) {
    for (const vendor of entry.vendorModules) modules.add(vendor);
  }
  return Object.freeze([...modules].sort());
})();

/**
 * Repository-root files that are not under `packages/<owner>/` but still belong
 * to a capability owner for vendor-import purposes (e.g. Capacitor shell config).
 */
export const ROOT_VENDOR_OWNED_FILES: ReadonlyArray<{
  relativePath: string;
  ownerFolder: string;
}> = [
  { relativePath: 'capacitor.config.ts', ownerFolder: 'native-core' },
];

export function packageByFolder(folder: string): CapabilityPackage | undefined {
  return CAPABILITY_PACKAGES.find((entry) => entry.folder === folder);
}

export function ownersOfVendor(moduleName: string): readonly CapabilityPackage[] {
  return CAPABILITY_PACKAGES.filter((entry) =>
    entry.vendorModules.some(
      (owned) => moduleName === owned || moduleName.startsWith(owned + '/'),
    ),
  );
}

export function rootVendorOwnerFolder(relativePath: string): string | undefined {
  const normalized = relativePath.replace(/\\/g, '/');
  return ROOT_VENDOR_OWNED_FILES.find((entry) => entry.relativePath === normalized)
    ?.ownerFolder;
}
