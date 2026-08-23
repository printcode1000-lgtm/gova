/**
 * Generate APPLICATION_FEATURES registry from disk + cross-feature door imports.
 * Writes packages/architecture-core/src/registry/application-features-registry.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const FEATURES_DIR = join(ROOT, 'src/features');
const SKIP = new Set(['node_modules', '.git', '.next', 'out']);

const PURPOSE: Record<string, string> = {
  'account-bridge': 'Application wiring for cross-account notification identity bridging',
  advertisements: 'Home advertisements surfaces (hero slider, featured marquee, trending ribbon)',
  'app-reset': 'Client application reset orchestration',
  auth: 'Authentication, session, registration, and account deletion UI/services',
  cart: 'Shopping cart client and server orchestration',
  'catalog-studio': 'Developer catalog studio editing surfaces',
  categories: 'Category browsing and seller discovery presentation',
  contact: 'Contact actions and seller contact orchestration',
  data: 'Data-core application port wiring',
  'data-health': 'Development data-health inspection and cleanup UI',
  'dev-cloud-backup': 'Development Turso cloud backup console',
  'dev-tools': 'Developer-only tooling pages',
  favorites: 'Favorites list and adapters',
  'feature-flags': 'Feature flag evaluation wiring',
  follow: 'Follow/unfollow seller relationships',
  'google-play-console': 'Release console, deploy runbook, and Play Store assets UI',
  home: 'Home screen composition',
  location: 'Location capture and map-related application surfaces',
  navigation: 'In-app navigation helpers',
  network: 'Network status UI and hooks',
  notifications: 'Notification behaviour, UI, and server orchestration',
  onboarding: 'Merchant onboarding wizard',
  orders: 'Orders presentation and server orchestration',
  ota: 'OTA application wiring and server surfaces',
  'page-save': 'Page-save gateway application wiring and hooks',
  'page-snapshot': 'Page snapshot application wiring',
  'password-recovery': 'Password recovery flows',
  'pharmacy-profile-catalog': 'Pharmacy profile catalog editing',
  product: 'Product detail, style editors, and product services',
  'product-card': 'Product card view-model and presentation',
  'product-search': 'Product search panel and page',
  profile: 'Seller/user profile surfaces',
  'profile-products': 'Profile products tabs presentation',
  'profile-working-hours': 'Working hours card presentation',
  'qr-code': 'QR code generation helpers',
  'release-commands': 'Release build-job client and server wiring',
  'seller-card': 'Seller card view-model and presentation',
  'seller-discounts': 'Seller discount rules UI and services',
  settings: 'Settings screens',
  sharing: 'Native/web sharing orchestration',
  'specialty-chat': 'Specialty chat surfaces',
  splash: 'Splash screen',
  storage: 'Storage upload application wiring and UI',
  'super-admin': 'Super-admin operational UI',
  'system-logs': 'System logs collector wiring and admin UI',
  'vehicle-catalog': 'Vehicle catalog helpers',
  'voice-input': 'Voice input UI helpers',
};

const CAPABILITY_OWNERS: Record<string, string[]> = {
  'account-bridge': ['@asol/account-bridge'],
  advertisements: [
    '@asol/hero-slider-core',
    '@asol/featured-marquee-core',
    '@asol/trending-ribbon-core',
  ],
  auth: ['@asol/auth-core'],
  'catalog-studio': ['@asol/catalog-core'],
  categories: ['@asol/catalog-core'],
  data: ['@asol/data-core'],
  'data-health': ['@asol/data-health-core', '@asol/data-core'],
  'dev-cloud-backup': ['@asol/backup-core', '@asol/data-core'],
  'dev-tools': ['@asol/dev-core'],
  'google-play-console': ['@asol/google-play-store-assets-core', '@asol/release-core', '@asol/ota-core'],
  location: ['@asol/map-core'],
  notifications: ['@asol/notifications-core'],
  orders: ['@asol/orders-core'],
  ota: ['@asol/ota-core'],
  'page-save': ['@asol/page-save-core'],
  'page-snapshot': ['@asol/page-snapshot-core'],
  product: ['@asol/product-core', '@asol/product-style-core'],
  'release-commands': ['@asol/release-core'],
  storage: ['@asol/storage-core', '@asol/storage-image-manager-core'],
  'system-logs': ['@asol/system-logs-core'],
  sharing: ['@asol/native-core'],
};

function listFeatures(): string[] {
  return readdirSync(FEATURES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function hasFile(feature: string, name: string): boolean {
  return existsSync(join(FEATURES_DIR, feature, name));
}

function hasDir(feature: string, name: string): boolean {
  const p = join(FEATURES_DIR, feature, name);
  return existsSync(p) && statSync(p).isDirectory();
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

function featureOf(rel: string): string | null {
  const m = rel.match(/^src\/features\/([^/]+)\//);
  return m ? m[1]! : null;
}

/** Collect door-level dependencies: feature A depends on feature B when A imports a B door. */
function collectDeps(features: string[]): Map<string, Set<string>> {
  const deps = new Map<string, Set<string>>();
  for (const f of features) deps.set(f, new Set());

  const IMPORT_RE =
    /(?:import|export)\s+(?:type\s+)?(?:[^'"\n]+?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const file of walk(join(ROOT, 'src/features'))) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const from = featureOf(rel);
    if (!from) continue;
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(IMPORT_RE)) {
      const spec = match[1] ?? match[2];
      if (!spec) continue;
      const m = spec.match(/^@\/features\/([^/]+)(?:\/(ui|server|index))?$/);
      if (!m) continue;
      const to = m[1]!;
      if (to === from) continue;
      deps.get(from)!.add(to);
    }
  }
  return deps;
}

const features = listFeatures();
const deps = collectDeps(features);

type FeatureEntry = {
  name: string;
  sourcePath: string;
  owns: string;
  doors: string[];
  runtimeTargets: string[];
  capabilityOwners: string[];
  permittedDependencies: string[];
  hasBrowser: boolean;
  hasServer: boolean;
  hasUi: boolean;
};

const entries: FeatureEntry[] = features.map((name) => {
  const doors: string[] = [];
  if (hasFile(name, 'index.ts') || hasFile(name, 'index.tsx')) doors.push('.');
  if (hasFile(name, 'ui.ts') || hasFile(name, 'ui.tsx')) doors.push('./ui');
  if (hasFile(name, 'server.ts') || hasFile(name, 'server.tsx')) doors.push('./server');

  const hasUi =
    hasDir(name, 'presentation') ||
    hasFile(name, 'ui.ts') ||
    hasDir(name, 'hooks');
  const hasServer =
    hasFile(name, 'server.ts') ||
    hasDir(name, 'server') ||
    hasDir(name, 'infrastructure') ||
    // any *.server.ts under the feature
    walk(join(FEATURES_DIR, name)).some((f) => f.endsWith('.server.ts'));
  const hasBrowser = hasUi || hasDir(name, 'application') || hasDir(name, 'hooks');

  const runtimeTargets: string[] = ['web'];
  if (hasBrowser) runtimeTargets.push('android', 'ios');
  if (hasServer) runtimeTargets.push('server');

  return {
    name,
    sourcePath: `src/features/${name}`,
    owns: PURPOSE[name] ?? `Application feature: ${name}`,
    doors,
    runtimeTargets,
    capabilityOwners: CAPABILITY_OWNERS[name] ?? [],
    permittedDependencies: [...(deps.get(name) ?? [])].sort(),
    deepImportSeams: name === 'notifications' ? ['auth', 'orders', 'specialty-chat'] : name === 'release-commands' ? ['google-play-console'] : [],
    hasBrowser,
    hasServer,
    hasUi,
  };
});

const outPath = join(
  ROOT,
  'packages/architecture-core/src/registry/application-features-registry.ts',
);

const body = `/**
 * Canonical application-feature registry.
 *
 * Every top-level directory under \`src/features/\` MUST appear here. A feature
 * that exists on disk without a registry entry — or a registry entry that points
 * at a missing folder — fails \`architecture:check\`. Cross-feature imports are
 * allowed only through declared doors, and only toward features listed in
 * \`permittedDependencies\`.
 *
 * SOURCE OF TRUTH for application features. Reference docs under
 * \`docs/01-architecture/08-reference/\` are generated from this registry.
 */

export type FeatureDoor = '.' | './ui' | './server';

export type FeatureRuntimeTarget = 'web' | 'android' | 'ios' | 'server' | 'service';

export interface ApplicationFeature {
  /** Directory name under \`src/features/\`. */
  name: string;
  /** Repository-relative source root. */
  sourcePath: string;
  /** One-line ownership / purpose statement. */
  owns: string;
  /** Declared public doors (mirrors package \`exports\` idea). */
  doors: readonly FeatureDoor[];
  /** Runtimes this feature participates in. */
  runtimeTargets: readonly FeatureRuntimeTarget[];
  /** Associated sealed \`@asol/*\` capability owners. */
  capabilityOwners: readonly string[];
  /** Other application features this one may import (by door only). */
  permittedDependencies: readonly string[];
  /**
   * Justified deep-import seams into other features (rare). Empty for almost every feature.
   * Example: notifications may deep-import auth/orders/specialty-chat to avoid door cycles.
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
 * Approved top-level directories under \`src/\`. Anything else fails the scan.
 * Framework-required root files (\`instrumentation.ts\`, \`proxy.ts\`, …) are files, not directories.
 */
export const APPROVED_SRC_ROOTS = ['app', 'core', 'features', 'shared'] as const;

/**
 * Canonical feature vocabulary for internal folders. Features may use a subset.
 * Competing aliases (\`entities\`, top-level \`components\`) are rejected.
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

export const APPLICATION_FEATURES: readonly ApplicationFeature[] = ${JSON.stringify(entries, null, 2).replace(/"(\w+)":/g, '$1:').replace(/"/g, "'")} as const;

export function featureByName(name: string): ApplicationFeature | undefined {
  return APPLICATION_FEATURES.find((f) => f.name === name);
}

export function featureDoorSpecifiers(feature: ApplicationFeature): readonly string[] {
  return feature.doors.map((door) =>
    door === '.' ? \`@/features/\${feature.name}\` : \`@/features/\${feature.name}/\${door.slice(2)}\`,
  );
}

export function isFeatureDoorSpecifier(specifier: string): { feature: string; door: FeatureDoor } | null {
  const m = specifier.match(/^@\\/features\\/([^/]+)(?:\\/(ui|server))?$/);
  if (!m) return null;
  const feature = m[1]!;
  const door: FeatureDoor = m[2] === 'ui' ? './ui' : m[2] === 'server' ? './server' : '.';
  const entry = featureByName(feature);
  if (!entry) return null;
  if (!entry.doors.includes(door)) return null;
  return { feature, door };
}
`;

writeFileSync(outPath, body);
console.log(`Wrote ${outPath} with ${entries.length} features`);
