/**
 * ASOL Architecture Contract — layer definitions.
 * This file is the single source of truth for automated architecture checks.
 */

export type ArchitectureLayer =
  | 'configuration'
  | 'asol-http-transport'
  | 'asol-api-client'
  | 'api-shared'
  | 'ui'
  | 'hooks'
  | 'client-services'
  | 'business-api'
  | 'server-services'
  | 'operations'
  | 'repository'
  | 'database-client'
  | 'provisioning'
  | 'dev-tools'
  | 'shared';

export const LAYER_LABELS: Record<ArchitectureLayer, string> = {
  configuration: 'Configuration Layer',
  'asol-http-transport': 'HTTP Transport (fetch gateway)',
  'asol-api-client': 'AsolApiClient',
  'api-shared': 'API Shared Utilities',
  ui: 'UI Layer',
  hooks: 'Hooks Layer',
  'client-services': 'Client Services',
  'business-api': 'Business API',
  'server-services': 'Server Services',
  operations: 'Query / Command Layer',
  repository: 'Repository Layer',
  'database-client': 'Database Client',
  provisioning: 'Schema Provisioning (build-only)',
  'dev-tools': 'Dev Tools',
  shared: 'Shared Utilities',
};

export const ALLOWED_PROCESS_ENV_FILES = new Set([
  'src/core/config/runtime-context.server.ts',
  'src/core/config/public-env.ts',
  'src/core/config/server-env.ts',
  'src/core/config/server-env.values.ts',
  'src/core/config/catalog-studio.server.ts',
  'src/core/config/system-logs.server.ts',
  'src/core/config/development-guard.server.ts',
  'src/instrumentation.ts',
  // The release console resolves its own Play credentials; the other two developer modules read
  // nothing themselves any more — they ask `src/core/config/development-guard.server.ts`.
  'src/features/google-play-console/domain/development-guard.server.ts',
  'src/features/dev-cloud-backup/tests/dev-cloud-backup-policy.test.ts',
  'src/features/data-health/tests/development-guard.test.ts',
  'src/features/notifications/tests/mobile-push-crypto.test.ts',
  'src/features/notifications/tests/mobile-push-unlock.service.test.ts',
  // Spawns one child per case with `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL` set or
  // cleared, because `publicEnv` freezes the value at module load. Building a
  // child's environment is process management, not configuration reading — and
  // inheriting the ambient value is precisely the bug it exists to prevent.
  'src/features/notifications/tests/dev-notification-bridge.test.ts',
]);

/**
 * Only dedicated transport modules may call `fetch` directly. The rule keeps
 * UI, hooks, and business services off the network; it is not a ban on HTTP in
 * the files whose whole job is a single hop.
 *
 * The inter-account channel is the connector between deployments. It lives in
 * `@asol/account-bridge`, and the application imports that door directly — the re-export shims
 * that once stood in front of it under `src/features/*-bridge/` are gone. Two names for one
 * connector make the seal harder to read and, when one of them was a real duplicate, they drifted.
 * Neither backend can reach the other, so the hop happens on the device: it
 * carries a signed grant, sends no credentials, and holds no business logic.
 */
export const ALLOWED_FETCH_FILES = new Set([
  'src/core/api/asol-http-transport.ts',
  'packages/account-bridge/src/notifications.ts',
]);

/**
 * Database code lives in one sealed package. These three lists used to point at
 * `src/features/data-access/`, where a folder path was the only thing standing between an
 * app file and `drizzle-orm`. They now point inside `@asol/data-core`, and the folder they
 * name — `src/core/` — has no entry in that package's `exports` map, so the seal, not a
 * regular expression, is what keeps the ORM out of the rest of the repository.
 */
export const ALLOWED_DRIZZLE_ORM_FILES_PATTERN = [
  /^packages\/data-core\/src\//,
];

export const ALLOWED_DB_DRIVER_FILES_PATTERN = [
  /^packages\/data-core\/src\//,
];

export const ALLOWED_SQL_FILES_PATTERN = [
  /^packages\/data-core\/src\//,
];

/** Client-side IndexedDB utilities — not the server Database Client layer. */
const CLIENT_STORAGE_PATHS = new Set([
  'packages/data-core/src/browser/asol-db-persister.ts',
  'packages/data-core/src/browser/asol-db/index.ts',
]);

const SERVER_ONLY_ALLOWED_LAYERS: ArchitectureLayer[] = [
  'configuration',
  'server-services',
  'business-api',
  'database-client',
  'provisioning',
  'operations',
  'repository',
  'dev-tools',
];

export const RAW_SQL_PATTERNS = [
  /\bSELECT\s+[\w"`.*,\s()]+\s+FROM\s+/i,
  /\bINSERT\s+INTO\s+/i,
  /\bUPDATE\s+[`"\w.]+\s+SET\s+/i,
  /\bDELETE\s+FROM\s+/i,
  /sql`[\s\S]*?`/i,
  /\.execute\s*\(\s*['"`]\s*(SELECT|INSERT|UPDATE|DELETE)/i,
  /\.prepare\s*\(\s*['"`]\s*(SELECT|INSERT|UPDATE|DELETE)/i,
  /\.raw\s*\(\s*['"`]\s*(SELECT|INSERT|UPDATE|DELETE)/i,
  /\bPRAGMA\s+[A-Za-z_]/i,
  /\b(?:CREATE|ALTER|DROP)\s+(?:TABLE|INDEX|TRIGGER|VIEW)\b/i,
];

export const DIRECT_DATABASE_CALL_PATTERNS = [
  /\b(?:db|database|sqlite|turso|client|connection|drizzleDb)\s*\.\s*(?:execute|prepare|exec|run|all|transaction)\s*\(/,
];

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function classifyLayer(relativePath: string): ArchitectureLayer {
  const p = normalizePath(relativePath);

  if (ALLOWED_PROCESS_ENV_FILES.has(p)) return 'configuration';
  if (CLIENT_STORAGE_PATHS.has(p)) return 'shared';
  if (p === 'src/middleware.ts') return 'configuration';
  // The wrapper every Business API route body runs inside. It lives beside the other API
  // modules rather than under a route folder, but it is server-only and belongs to the layer
  // it wraps — not to the browser-safe shared utilities around it.
  if (p === 'src/core/api/traced-route.ts') return 'business-api';
  if (p === 'src/core/api/asol-http-transport.ts') return 'asol-http-transport';
  if (p === 'src/core/api/asol-api-client.ts') return 'asol-api-client';
  if (p.startsWith('src/core/api/')) return 'api-shared';
  if (p.startsWith('src/core/config/')) return 'configuration';
  // The composition roots wire sealed packages into the application at start-up. They know both
  // sides by design — that is what a seam is — so they answer to the configuration layer's rules
  // rather than the shared-utility ones, which forbid `server-only`.
  if (p.startsWith('src/core/composition/')) return 'configuration';
  if (p.startsWith('packages/data-core/src/tooling/')) return 'provisioning';
  if (p.startsWith('packages/data-core/src/provisioning/core/')) return 'provisioning';
  if (p.startsWith('packages/data-core/src/domains/') && p.includes('/tests/')) return 'dev-tools';
  if (p.startsWith('packages/data-core/src/domains/') && p.includes('/application/')) return 'server-services';
  if (p.startsWith('packages/data-core/src/core/')) return 'database-client';
  if (p.startsWith('packages/data-core/src/browser/')) return 'shared';
  if (p.startsWith('packages/data-core/src/domains/marketplace-orders/db/')) return 'database-client';
  if (p.startsWith('packages/data-core/src/domains/marketplace-orders/') && p.endsWith('/index.server.ts')) return 'server-services';
  if (p.startsWith('packages/data-core/src/domains/') && p.endsWith('/index.server.ts')) return 'operations';
  if (p.startsWith('packages/data-core/src/domains/') && p.includes('/commands/')) return 'operations';
  if (p.startsWith('packages/data-core/src/domains/') && p.includes('/queries/')) return 'operations';
  if (p === 'src/features/data-health/domain/execution-context.server.ts') return 'configuration';
  if (p === 'src/features/data-health/domain/development-guard.server.ts') return 'configuration';
  if (p === 'src/features/dev-cloud-backup/domain/development-guard.server.ts') return 'configuration';
  if (p === 'src/features/google-play-console/domain/development-guard.server.ts') return 'configuration';
  if (p.startsWith('src/features/release-commands/tests/')) return 'dev-tools';
  if (p.startsWith('src/features/data-health/tests/')) return 'dev-tools';
  if (p.startsWith('src/features/dev-cloud-backup/tests/')) return 'dev-tools';
  if (p.startsWith('packages/orders-core/src/')) return 'shared';
  // A feature's application layer is orchestration that runs on the server: it composes services,
  // repositories and notifications for one use case. Named `*.server.ts` so the half that could
  // run in a browser stays distinguishable — only the server half is classified here.
  if (p.includes('/application/') && /^src\/features\//.test(p) && p.endsWith('.server.ts')) {
    return 'server-services';
  }
  // A feature's server entry point — `src/features/<name>/server.ts` — is the
  // server half of that module's public API, not a shared utility. Without this
  // it falls through to `shared`, where importing `server-only` is forbidden.
  if (/^src\/features\/[^/]+\/server\.ts$/.test(p)) return 'server-services';
  if (/^src\/features\/[^/]+\/server\//.test(p)) return 'server-services';
  if (p.includes('/repositories/')) return 'repository';
  if (p.includes('/operations/')) return 'operations';
  if (
    p.includes('-service.server.') ||
    p.includes('-service-parts/') ||
    (p.includes('/services/') && p.includes('-service/')) ||
    (p.endsWith('.server.ts') && p.includes('/services/'))
  ) {
    return 'server-services';
  }
  if (p.includes('/services/') && (p.endsWith('-api-service.ts') || p.endsWith('/auth-service.ts') || p.endsWith('/session-service.ts'))) {
    return 'client-services';
  }
  if (p.includes('/hooks/')) return 'hooks';
  if (p.startsWith('src/app/api/')) return 'business-api';
  if (p.startsWith('src/app/dev/') || p.startsWith('src/features/dev-tools/')) return 'dev-tools';
  // Shared application UI (design-system primitives, shell, brand) lives under src/shared/.
  if (p.startsWith('src/shared/layouts/') || p.startsWith('src/shared/brand/') || p.startsWith('src/shared/ui/')) {
    return 'ui';
  }
  if (/^src\/features\/[^/]+\/presentation\//.test(p)) return 'ui';
  if (p.startsWith('src/app/') && !p.startsWith('src/app/api/')) return 'ui';
  if (p.startsWith('src/dev/')) return 'dev-tools';

  return 'shared';
}

export function isClientComponent(content: string): boolean {
  return /^['"]use client['"];?/m.test(content);
}

export function isServerOnlyModule(content: string): boolean {
  return /^import ['"]server-only['"];?/m.test(content);
}

export function resolveImportPath(importPath: string, importerPath: string): string | null {
  if (importPath.startsWith('@/')) {
    return `src/${importPath.slice(2)}`;
  }
  if (importPath.startsWith('.')) {
    const importerDir = normalizePath(importerPath).split('/').slice(0, -1);
    const segments = importPath.split('/');
    const resolved: string[] = [...importerDir];
    for (const seg of segments) {
      if (seg === '.' || seg === '') continue;
      if (seg === '..') resolved.pop();
      else resolved.push(seg);
    }
    return resolved.join('/');
  }
  return null;
}

export function importTargetLayer(importPath: string): ArchitectureLayer | 'external' | 'forbidden-package' {
  const pkg = importPath.split('/')[0];

  if (importPath === 'server-only' || importPath.startsWith('server-only/')) return 'forbidden-package';
  if (importPath === 'drizzle-orm' || importPath.startsWith('drizzle-orm/')) return 'forbidden-package';
  if (importPath === 'better-sqlite3') return 'forbidden-package';
  if (importPath === '@libsql/client' || importPath.startsWith('@libsql/')) return 'forbidden-package';
  if (importPath === 'axios') return 'forbidden-package';

  // `@asol/data-core` is reached only through its declared doors, so the door name is the
  // layer. Without this the whole package would classify as `external` and every layer
  // rule that used to guard `src/features/data-access/` would stop applying the moment the
  // code moved into the package.
  if (importPath === '@asol/data-core' || importPath.startsWith('@asol/data-core/')) {
    const dataCoreDoor = importPath.slice('@asol/data-core'.length).replace(/^\//, '');
    if (dataCoreDoor === '') return 'shared';
    if (dataCoreDoor === 'core') return 'database-client';
    if (dataCoreDoor === 'browser') return 'shared';
    // Port seams — browser-safe configure/getters with no DB drivers.
    if (
      dataCoreDoor === 'telemetry' ||
      dataCoreDoor === 'runtime-config' ||
      dataCoreDoor === 'product-search-fields'
    ) {
      return 'shared';
    }
    if (dataCoreDoor === 'provisioning' || dataCoreDoor === 'tooling') return 'provisioning';
    if (dataCoreDoor === 'marketplace-orders') return 'server-services';
    return 'operations';
  }

  const resolved = importPath.startsWith('@/') ? `src/${importPath.slice(2)}` : null;
  if (!resolved) return 'external';

  if (resolved.startsWith('packages/data-core/src/core/')) return 'database-client';
  if (resolved.startsWith('packages/data-core/src/browser/')) return 'shared';
  if (resolved.startsWith('packages/data-core/src/domains/marketplace-orders/') && resolved.endsWith('/index.server')) {
    return 'server-services';
  }
  if (resolved.startsWith('packages/data-core/src/domains/') && resolved.endsWith('/index.server')) {
    return 'operations';
  }
  if (
    resolved.startsWith('packages/data-core/src/domains/') &&
    (resolved.includes('/commands/') || resolved.includes('/queries/'))
  ) {
    return 'operations';
  }
  if (resolved.includes('/repositories/')) return 'repository';
  if (resolved.includes('/operations/')) return 'operations';
  if (resolved.includes('-service.server') || (resolved.includes('/services/') && resolved.endsWith('.server.ts'))) {
    return 'server-services';
  }
  if (resolved.includes('/services/') && (resolved.includes('-api-service') || resolved.endsWith('/auth-service') || resolved.endsWith('/session-service'))) {
    return 'client-services';
  }
  if (resolved.includes('/core/database/asol-db-persister') || resolved.startsWith('packages/data-core/src/browser/asol-db/')) {
    return 'shared';
  }
  if (resolved.includes('/core/database/db-client') || resolved.includes('/core/database/sqlite-db-client') || resolved.includes('/core/database/profile-db-client')) {
    return 'database-client';
  }
  if (resolved.includes('/core/database/') || resolved === 'packages/data-core/src/core/turso/users-turso-client.ts') {
    return 'database-client';
  }
  if (resolved.includes('/core/api/asol-api-client') || resolved === 'src/core/api') return 'asol-api-client';
  if (resolved.includes('/core/api/')) return 'api-shared';
  if (resolved.includes('/hooks/')) return 'hooks';
  if (
    resolved.startsWith('src/shared/layouts/') ||
    resolved.startsWith('src/shared/brand/') ||
    resolved.startsWith('src/shared/ui/')
  ) {
    return 'ui';
  }
  if (/^src\/features\/[^/]+\/presentation\//.test(resolved)) return 'ui';

  return classifyLayer(resolved);
}

const FORBIDDEN_IMPORTS_BY_LAYER: Partial<Record<ArchitectureLayer, ArchitectureLayer[]>> = {
  ui: ['repository', 'operations', 'server-services', 'database-client', 'provisioning', 'business-api'],
  hooks: ['repository', 'operations', 'server-services', 'database-client', 'provisioning', 'business-api'],
  'client-services': [
    'repository',
    'operations',
    'server-services',
    'database-client',
    'provisioning',
    'business-api',
    'ui',
    'hooks',
  ],
  'business-api': ['repository', 'operations', 'database-client', 'provisioning', 'ui', 'hooks', 'client-services'],
  'server-services': ['repository', 'database-client', 'provisioning', 'ui', 'hooks', 'client-services', 'business-api'],
  operations: ['database-client', 'provisioning', 'ui', 'hooks', 'client-services', 'server-services', 'business-api'],
  repository: ['ui', 'hooks', 'client-services', 'business-api', 'server-services', 'provisioning'],
};

export function getForbiddenImportViolation(
  importerLayer: ArchitectureLayer,
  target: ArchitectureLayer | 'forbidden-package',
  importPath: string
): string | null {
  if (target === 'forbidden-package') {
    if (importPath === 'server-only' || importPath.startsWith('server-only/')) {
      if (SERVER_ONLY_ALLOWED_LAYERS.includes(importerLayer)) return null;
    }
    if (importerLayer === 'repository' || importerLayer === 'database-client' || importerLayer === 'provisioning') {
      return null;
    }
    if (importerLayer === 'dev-tools') return null;
    return `Forbidden package import "${importPath}" in ${LAYER_LABELS[importerLayer]}.`;
  }

  const forbidden = FORBIDDEN_IMPORTS_BY_LAYER[importerLayer];
  if (!forbidden) return null;

  if (importerLayer === 'server-services' && target === 'operations') return null;
  if (importerLayer === 'server-services' && target === 'server-services') return null;
  if (importerLayer === 'operations' && target === 'repository') return null;
  if (importerLayer === 'business-api' && target === 'server-services') return null;
  if (importerLayer === 'hooks' && target === 'client-services') return null;
  if (importerLayer === 'ui' && target === 'hooks') return null;
  if (importerLayer === 'client-services' && target === 'asol-api-client') return null;
  if (importerLayer === 'asol-api-client' && target === 'asol-http-transport') return null;
  if (importerLayer === 'asol-api-client' && target === 'configuration') return null;
  if (importerLayer === 'dev-tools' && (target === 'asol-api-client' || target === 'configuration')) return null;
  if (importerLayer === 'shared' && target !== 'database-client' && target !== 'repository') return null;

  if (forbidden.includes(target)) {
    return `${LAYER_LABELS[target]} cannot be imported from ${LAYER_LABELS[importerLayer]}.`;
  }

  return null;
}
