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
  'src/instrumentation.ts',
  'src/modules/data-access/domains/marketplace-orders/db/config.ts',
  'src/modules/dev-cloud-backup/domain/development-guard.server.ts',
  'src/modules/google-play-console/domain/development-guard.server.ts',
  'src/modules/dev-cloud-backup/tests/dev-cloud-backup-policy.test.ts',
]);

/**
 * Only dedicated transport modules may call `fetch` directly. The rule keeps
 * UI, hooks, and business services off the network; it is not a ban on HTTP in
 * the files whose whole job is a single hop.
 *
 * `notification-bridge.client.ts` is the connector between the two deployments.
 * Neither backend can reach the other, so the hop happens in the browser: it
 * carries a signed grant, sends no credentials, and holds no business logic.
 */
export const ALLOWED_FETCH_FILES = new Set([
  'src/core/api/asol-http-transport.ts',
  'src/modules/notification-bridge/notification-bridge.client.ts',
]);

export const ALLOWED_DRIZZLE_ORM_FILES_PATTERN = [
  /^src\/modules\/data-access\//,
];

export const ALLOWED_DB_DRIVER_FILES_PATTERN = [
  /^src\/modules\/data-access\//,
];

export const ALLOWED_SQL_FILES_PATTERN = [
  /^src\/modules\/data-access\//,
];

/** Client-side IndexedDB utilities — not the server Database Client layer. */
const CLIENT_STORAGE_PATHS = new Set([
  'src/modules/data-access/browser/asol-db-persister.ts',
  'src/modules/data-access/browser/asol-db/index.ts',
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
  if (p === 'src/core/api/asol-http-transport.ts') return 'asol-http-transport';
  if (p === 'src/core/api/asol-api-client.ts') return 'asol-api-client';
  if (p.startsWith('src/core/api/')) return 'api-shared';
  if (p.startsWith('src/core/config/')) return 'configuration';
  if (p.startsWith('src/core/provisioning/')) return 'provisioning';
  if (p.startsWith('src/modules/data-access/tooling/')) return 'provisioning';
  if (p.startsWith('src/modules/data-access/domains/') && p.includes('/tests/')) return 'dev-tools';
  if (p.startsWith('src/modules/data-access/domains/') && p.includes('/application/')) return 'server-services';
  if (p.startsWith('src/modules/data-access/core/')) return 'database-client';
  if (p.startsWith('src/modules/data-access/browser/')) return 'shared';
  if (p.startsWith('src/modules/data-access/domains/marketplace-orders/db/')) return 'database-client';
  if (p.startsWith('src/modules/data-access/domains/marketplace-orders/') && p.endsWith('/index.server.ts')) return 'server-services';
  if (p.startsWith('src/modules/data-access/domains/') && p.endsWith('/index.server.ts')) return 'operations';
  if (p.startsWith('src/modules/data-access/domains/') && p.includes('/commands/')) return 'operations';
  if (p.startsWith('src/modules/data-access/domains/') && p.includes('/queries/')) return 'operations';
  if (p === 'src/modules/data-health/domain/execution-context.server.ts') return 'configuration';
  if (p === 'src/modules/dev-cloud-backup/domain/development-guard.server.ts') return 'configuration';
  if (p === 'src/modules/google-play-console/domain/development-guard.server.ts') return 'configuration';
  if (p.startsWith('src/modules/release-commands/tests/')) return 'dev-tools';
  if (p.startsWith('src/modules/release-commands/services/') && p.endsWith('-api-service.ts')) return 'client-services';
  if (p.startsWith('src/modules/release-commands/services/')) return 'server-services';
  if (p.startsWith('src/modules/data-health/services/')) return 'server-services';
  if (p.startsWith('src/modules/dev-cloud-backup/services/')) return 'server-services';
  if (p.startsWith('src/modules/google-play-console/services/')) return 'server-services';
  if (p.startsWith('src/modules/dev-cloud-backup/tests/')) return 'dev-tools';
  if (p.startsWith('src/modules/marketplace-orders/api/') || p.startsWith('src/modules/marketplace-orders/services/')) return 'server-services';
  if (p.startsWith('src/modules/data-access/provisioning/core/')) return 'provisioning';
  if (p.includes('/application/') && p.includes('/features/storage/')) return 'server-services';
  if (
    p === 'src/core/storage/output-format.registry.ts' ||
    p.endsWith('/output-format.registry')
  ) {
    return 'shared';
  }
  if (
    p.startsWith('src/core/storage/') &&
    !p.includes('.client.') &&
    !p.includes('/rules/') &&
    !p.includes('/types/') &&
    !p.includes('/constants/')
  ) {
    return 'server-services';
  }
  if (p.includes('/repositories/')) return 'repository';
  if (p.includes('/operations/')) return 'operations';
  if (p.includes('-service.server.') || (p.endsWith('.server.ts') && p.includes('/services/'))) {
    return 'server-services';
  }
  if (p.includes('/services/') && (p.endsWith('-api-service.ts') || p.endsWith('/auth-service.ts') || p.endsWith('/session-service.ts'))) {
    return 'client-services';
  }
  if (p.includes('/hooks/')) return 'hooks';
  if (p.startsWith('src/app/api/')) return 'business-api';
  if (p.startsWith('src/app/dev/') || p.startsWith('src/core/monitor/')) return 'dev-tools';
  if (p.startsWith('src/components/')) return 'ui';
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

  const resolved = importPath.startsWith('@/') ? `src/${importPath.slice(2)}` : null;
  if (!resolved) return 'external';

  if (resolved.startsWith('src/modules/data-access/core/')) return 'database-client';
  if (resolved.startsWith('src/modules/data-access/browser/')) return 'shared';
  if (resolved.startsWith('src/modules/data-access/domains/marketplace-orders/') && resolved.endsWith('/index.server')) {
    return 'server-services';
  }
  if (resolved.startsWith('src/modules/data-access/domains/') && resolved.endsWith('/index.server')) {
    return 'operations';
  }
  if (
    resolved.startsWith('src/modules/data-access/domains/') &&
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
  if (resolved.includes('/core/database/asol-db-persister') || resolved.startsWith('src/modules/data-access/browser/asol-db/')) {
    return 'shared';
  }
  if (resolved.includes('/core/database/db-client') || resolved.includes('/core/database/sqlite-db-client') || resolved.includes('/core/database/profile-db-client')) {
    return 'database-client';
  }
  if (resolved.includes('/core/database/') || resolved === 'src/modules/data-access/core/turso/users-turso-client.ts') {
    return 'database-client';
  }
  if (resolved.includes('/core/api/asol-api-client') || resolved === 'src/core/api') return 'asol-api-client';
  if (resolved.includes('/core/api/')) return 'api-shared';
  if (resolved.includes('/hooks/')) return 'hooks';
  if (resolved.startsWith('src/components/')) return 'ui';

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
  if (
    importerLayer === 'server-services' &&
    target === 'provisioning' &&
    (importPath.includes('/core/provisioning/r2') || importPath.includes('/core/provisioning/r2-'))
  ) {
    return null;
  }
  if (importerLayer === 'operations' && target === 'repository') return null;
  if (
    importerLayer === 'repository' &&
    target === 'server-services' &&
    (importPath.includes('/core/storage/storage/') ||
      importPath.includes('/core/storage/profiles/'))
  ) {
    return null;
  }
  if (
    importerLayer === 'repository' &&
    target === 'provisioning' &&
    importPath.includes('/core/provisioning/r2-s3-client')
  ) {
    return null;
  }
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
