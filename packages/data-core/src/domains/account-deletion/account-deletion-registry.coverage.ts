import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  ACCOUNT_DELETION_REGISTRY_EXEMPT_TABLES,
  ACCOUNT_DELETION_TABLE_REGISTRY,
  type AccountDeletionDatabase,
} from './account-deletion-registry.persistence';

const USER_OWNED_COLUMN_PATTERN =
  /\b(uid|buyer_id|seller_id|buyer_uid|seller_uid|follower_uid|target_uid|target_owner_uid|carrier_uid|carrier_id|service_provider_id|uploaded_by|performed_by|opened_by|sender_id|cancelled_by|proposed_by|provider_id|original_carrier_id|actor_uid|approved_by_uid|revoked_by_uid)\b/i;

function tableBlockHasUserOwnedColumn(block: string): boolean {
  const columnSection = block.split(/\bFOREIGN\s+KEY\b|\bREFERENCES\b/i)[0] ?? block;
  return USER_OWNED_COLUMN_PATTERN.test(columnSection);
}

const CREATE_TABLE_PATTERN = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?([a-z0-9_]+)[`"]?/gi;

const CASCADE_PARENT_PATTERN =
  /REFERENCES\s+[`"]?user_profiles[`"]?\s*\(\s*[`"]?uid[`"]?\s*\)[^;]*ON\s+DELETE\s+cascade/i;

export interface MigrationScanSource {
  database: AccountDeletionDatabase;
  directory: string;
}

export interface DiscoveredUserOwnedTable {
  database: AccountDeletionDatabase;
  table: string;
  coveredBy: 'registry' | 'cascade' | 'exempt';
}

function tableKey(database: AccountDeletionDatabase, table: string): string {
  return `${database}.${table}`;
}

export function getRegistryTableKeys(): Set<string> {
  return new Set(
    ACCOUNT_DELETION_TABLE_REGISTRY.map((entry) => tableKey(entry.database, entry.table)),
  );
}

export function getExemptTableKeys(): Set<string> {
  return new Set(
    ACCOUNT_DELETION_REGISTRY_EXEMPT_TABLES.map((entry) => tableKey(entry.database, entry.table)),
  );
}

export function getCascadeChildTableKeys(sqlByDatabase: Map<AccountDeletionDatabase, string>): Set<string> {
  const cascadeChildren = new Set<string>();
  for (const [database, sql] of sqlByDatabase) {
    if (database !== 'profiles') continue;
    const blocks = sql.split(/CREATE\s+TABLE/gi).slice(1);
    for (const block of blocks) {
      const tableMatch = block.match(/^(?:\s+IF\s+NOT\s+EXISTS\s+)?[`"]?([a-z0-9_]+)[`"]?/i);
      if (!tableMatch) continue;
      if (CASCADE_PARENT_PATTERN.test(block)) {
        cascadeChildren.add(tableKey(database, tableMatch[1]));
      }
    }
  }
  return cascadeChildren;
}

export function loadMigrationSqlByDatabase(
  repoRoot: string,
  sources: MigrationScanSource[],
): Map<AccountDeletionDatabase, string> {
  const sqlByDatabase = new Map<AccountDeletionDatabase, string>();
  for (const source of sources) {
    const directory = resolve(repoRoot, source.directory);
    const files = readdirSync(directory)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    const combined = files.map((file) => readFileSync(join(directory, file), 'utf8')).join('\n');
    sqlByDatabase.set(source.database, combined);
  }
  return sqlByDatabase;
}

export function discoverUserOwnedTables(
  sqlByDatabase: Map<AccountDeletionDatabase, string>,
): Array<{ database: AccountDeletionDatabase; table: string }> {
  const discovered: Array<{ database: AccountDeletionDatabase; table: string }> = [];

  for (const [database, sql] of sqlByDatabase) {
    CREATE_TABLE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null = CREATE_TABLE_PATTERN.exec(sql);
    while (match) {
      const table = match[1];
      const start = match.index;
      const nextCreate = sql.indexOf('CREATE TABLE', start + 1);
      const block = nextCreate === -1 ? sql.slice(start) : sql.slice(start, nextCreate);
      if (tableBlockHasUserOwnedColumn(block)) {
        discovered.push({ database, table });
      }
      match = CREATE_TABLE_PATTERN.exec(sql);
    }
  }

  return discovered;
}

export function evaluateRegistryCoverage(
  repoRoot: string,
  sources: MigrationScanSource[],
): {
  missing: Array<{ database: AccountDeletionDatabase; table: string }>;
  covered: DiscoveredUserOwnedTable[];
} {
  const sqlByDatabase = loadMigrationSqlByDatabase(repoRoot, sources);
  const registry = getRegistryTableKeys();
  const exempt = getExemptTableKeys();
  const cascadeChildren = getCascadeChildTableKeys(sqlByDatabase);
  const discovered = discoverUserOwnedTables(sqlByDatabase);

  const covered: DiscoveredUserOwnedTable[] = [];
  const missing: Array<{ database: AccountDeletionDatabase; table: string }> = [];

  for (const entry of discovered) {
    const key = tableKey(entry.database, entry.table);
    if (registry.has(key)) {
      covered.push({ ...entry, coveredBy: 'registry' });
      continue;
    }
    if (exempt.has(key)) {
      covered.push({ ...entry, coveredBy: 'exempt' });
      continue;
    }
    if (cascadeChildren.has(key)) {
      covered.push({ ...entry, coveredBy: 'cascade' });
      continue;
    }
    missing.push(entry);
  }

  return { missing, covered };
}

export const DEFAULT_MIGRATION_SCAN_SOURCES: MigrationScanSource[] = [
  { database: 'users', directory: 'packages/data-core/src/core/database/migrations' },
  { database: 'profiles', directory: 'packages/data-core/src/core/database/profile/migrations' },
  { database: 'products', directory: 'packages/data-core/src/core/database/product/migrations' },
  { database: 'notifications', directory: 'packages/data-core/src/core/database/notifications/migrations' },
  { database: 'orders', directory: 'packages/data-core/src/domains/marketplace-orders/db/migrations' },
];
