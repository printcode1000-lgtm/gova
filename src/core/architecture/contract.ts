/**
 * GOVA Architecture Contract — layer definitions.
 * This file is the single source of truth for automated architecture checks.
 */

export type ArchitectureLayer =
  | 'configuration'
  | 'gova-http-transport'
  | 'gova-api-client'
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
  'gova-http-transport': 'HTTP Transport (fetch gateway)',
  'gova-api-client': 'GovaApiClient',
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
  'src/core/config/runtime-env.ts',
  'src/core/config/public-env.ts',
  'src/core/config/server-env.ts',
  'src/core/config/server-env.values.ts',
]);

export const ALLOWED_FETCH_FILES = new Set(['src/core/api/gova-http-transport.ts']);

export const ALLOWED_DRIZZLE_ORM_FILES_PATTERN = [
  /^src\/core\/database\//,
  /^src\/features\/[^/]+\/repositories\//,
];

export const ALLOWED_DB_DRIVER_FILES_PATTERN = [
  /^src\/core\/database\//,
  /^src\/lib\/db\//,
  /^src\/core\/provisioning\//,
];

export const ALLOWED_SQL_FILES_PATTERN = [
  /^src\/core\/database\//,
  /^src\/features\/[^/]+\/repositories\//,
  /^src\/core\/database\/migrations\//,
  /^src\/core\/provisioning\//,
];

/** Client-side IndexedDB utilities — not the server Database Client layer. */
const CLIENT_STORAGE_PATHS = new Set([
  'src/core/database/gova-db-persister.ts',
  'src/lib/gova-db/index.ts',
]);

const SERVER_ONLY_ALLOWED_LAYERS: ArchitectureLayer[] = [
  'configuration',
  'server-services',
  'business-api',
  'database-client',
  'provisioning',
  'operations',
  'repository',
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
];

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function classifyLayer(relativePath: string): ArchitectureLayer {
  const p = normalizePath(relativePath);

  if (ALLOWED_PROCESS_ENV_FILES.has(p)) return 'configuration';
  if (CLIENT_STORAGE_PATHS.has(p)) return 'shared';
  if (p === 'src/middleware.ts') return 'configuration';
  if (p === 'src/core/api/gova-http-transport.ts') return 'gova-http-transport';
  if (p === 'src/core/api/gova-api-client.ts') return 'gova-api-client';
  if (p.startsWith('src/core/api/')) return 'api-shared';
  if (p.startsWith('src/core/config/')) return 'configuration';
  if (p.startsWith('src/core/provisioning/')) return 'provisioning';
  if (p.startsWith('src/core/database/')) return 'database-client';
  if (p === 'src/lib/db/turso.ts') return 'database-client';
  if (p.includes('/repositories/')) return 'repository';
  if (p.includes('/operations/')) return 'operations';
  if (p.includes('-service.server.') || (p.endsWith('.server.ts') && p.includes('/services/'))) {
    return 'server-services';
  }
  if (p.includes('/services/') && (p.endsWith('-api-service.ts') || p.endsWith('/auth-service.ts'))) {
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

  if (resolved.includes('/repositories/')) return 'repository';
  if (resolved.includes('/operations/')) return 'operations';
  if (resolved.includes('-service.server') || (resolved.includes('/services/') && resolved.endsWith('.server.ts'))) {
    return 'server-services';
  }
  if (resolved.includes('/services/') && (resolved.includes('-api-service') || resolved.endsWith('/auth-service'))) {
    return 'client-services';
  }
  if (resolved.includes('/core/database/gova-db-persister') || resolved.startsWith('src/lib/gova-db/')) {
    return 'shared';
  }
  if (resolved.includes('/core/database/db-client') || resolved.includes('/core/database/sqlite-db-client')) {
    return 'database-client';
  }
  if (resolved.includes('/core/database/') || resolved === 'src/lib/db/turso.ts') return 'database-client';
  if (resolved.includes('/core/api/gova-api-client') || resolved === 'src/core/api') return 'gova-api-client';
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
    return `Forbidden package import "${importPath}" in ${LAYER_LABELS[importerLayer]}.`;
  }

  const forbidden = FORBIDDEN_IMPORTS_BY_LAYER[importerLayer];
  if (!forbidden) return null;

  if (importerLayer === 'server-services' && target === 'operations') return null;
  if (importerLayer === 'operations' && target === 'repository') return null;
  if (importerLayer === 'business-api' && target === 'server-services') return null;
  if (importerLayer === 'hooks' && target === 'client-services') return null;
  if (importerLayer === 'ui' && target === 'hooks') return null;
  if (importerLayer === 'client-services' && target === 'gova-api-client') return null;
  if (importerLayer === 'gova-api-client' && target === 'gova-http-transport') return null;
  if (importerLayer === 'gova-api-client' && target === 'configuration') return null;
  if (importerLayer === 'dev-tools' && (target === 'gova-api-client' || target === 'configuration')) return null;
  if (importerLayer === 'shared' && target !== 'database-client' && target !== 'repository') return null;

  if (forbidden.includes(target)) {
    return `${LAYER_LABELS[target]} cannot be imported from ${LAYER_LABELS[importerLayer]}.`;
  }

  return null;
}
