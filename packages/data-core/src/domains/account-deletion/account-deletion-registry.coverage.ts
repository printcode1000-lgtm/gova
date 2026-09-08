import {
  ACCOUNT_DELETION_REGISTRY_EXEMPT_TABLES,
  ACCOUNT_DELETION_TABLE_REGISTRY,
  type AccountDeletionDatabase,
} from './account-deletion-registry.persistence';
import {
  DESIRED_SCHEMAS,
  LOGICAL_DATABASE_LABELS,
  type LogicalDatabaseLabel,
} from '../../provisioning/desired-schema/registry';
import type { TableSchema } from '../../provisioning/core/types';

/**
 * Which tables hold rows belonging to a user, and whether account deletion
 * accounts for each of them.
 *
 * Coverage used to be derived by concatenating every historical migration file
 * and scanning the combined text for `CREATE TABLE`. That reads the past, not
 * the present: a table dropped in a later migration still appeared, a renamed
 * one appeared twice, and a column added by `ALTER TABLE` was invisible because
 * it never occurs inside a `CREATE TABLE` block. A deletion registry that is
 * checked against a schema the databases no longer have is checked against
 * nothing.
 *
 * The desired-schema manifests describe the final intended schema of each
 * database, so this now asks the question that matters: of the tables that exist
 * *now*, which carry a user-owned column, and is each one deleted, anonymized,
 * cascaded, or explicitly exempt.
 */

const USER_OWNED_COLUMN_PATTERN =
  /^(uid|buyer_id|seller_id|buyer_uid|seller_uid|follower_uid|target_uid|target_owner_uid|carrier_uid|carrier_id|service_provider_id|uploaded_by|performed_by|opened_by|sender_id|cancelled_by|proposed_by|provider_id|original_carrier_id|actor_uid|approved_by_uid|revoked_by_uid)$/i;

/**
 * Logical database labels grouped the way the deletion registry names them.
 *
 * The registry predates the shard split and speaks in five coarse databases;
 * the manifests are per-shard. Mapping here keeps the registry's vocabulary
 * stable while the schema source becomes exact.
 */
const REGISTRY_DATABASE_FOR_LABEL: Record<LogicalDatabaseLabel, AccountDeletionDatabase | null> = {
  users: 'users',
  product: 'products',
  advertisements: null,
  notifications: 'notifications',
  'profile-core': 'profiles',
  'profile-contact': 'profiles',
  'profile-media': 'profiles',
  'profile-social': 'profiles',
  'profile-catalog': 'profiles',
  'profile-promotions': 'profiles',
  'profile-fulfillment': 'profiles',
  // Operational state about the platform, not about a user account.
  'system-ops': null,
  'orders-core': 'orders',
  'orders-items': 'orders',
  'orders-fulfillment': 'orders',
  'orders-delivery-plans': 'orders',
  'orders-shipping-quotes': 'orders',
  'orders-payments': 'orders',
  'orders-refunds': 'orders',
  'orders-after-sales': 'orders',
  'orders-disputes-audit': 'orders',
};

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

function hasUserOwnedColumn(table: TableSchema): boolean {
  return table.columns.some((column) => USER_OWNED_COLUMN_PATTERN.test(column.name));
}

/**
 * Tables whose rows disappear on their own because a foreign key cascades from
 * the profile row being deleted.
 *
 * Read from foreign-key metadata rather than from CREATE-TABLE text: a cascade
 * declared inline, one declared as a table constraint, and one added later all
 * look different in SQL and identical here. Only an intra-database cascade
 * counts — a relationship that crosses a Turso database is an application
 * invariant, and no database enforces it on delete.
 */
export function getCascadeChildTableKeys(): Set<string> {
  const cascadeChildren = new Set<string>();
  for (const label of LOGICAL_DATABASE_LABELS) {
    const registryDatabase = REGISTRY_DATABASE_FOR_LABEL[label];
    if (!registryDatabase) continue;
    const schema = DESIRED_SCHEMAS[label];
    for (const table of Object.values(schema.tables)) {
      const cascades = table.foreignKeys.some(
        (foreignKey) =>
          foreignKey.referencesTable === 'user_profiles' &&
          foreignKey.referencesColumns.includes('uid') &&
          foreignKey.onDelete.toUpperCase() === 'CASCADE',
      );
      if (cascades) cascadeChildren.add(tableKey(registryDatabase, table.name));
    }
  }
  return cascadeChildren;
}

export function discoverUserOwnedTables(): Array<{
  database: AccountDeletionDatabase;
  table: string;
}> {
  const discovered: Array<{ database: AccountDeletionDatabase; table: string }> = [];
  for (const label of LOGICAL_DATABASE_LABELS) {
    const registryDatabase = REGISTRY_DATABASE_FOR_LABEL[label];
    if (!registryDatabase) continue;
    for (const table of Object.values(DESIRED_SCHEMAS[label].tables)) {
      if (hasUserOwnedColumn(table)) {
        discovered.push({ database: registryDatabase, table: table.name });
      }
    }
  }
  return discovered;
}

export function evaluateRegistryCoverage(): {
  missing: Array<{ database: AccountDeletionDatabase; table: string }>;
  covered: DiscoveredUserOwnedTable[];
} {
  const registry = getRegistryTableKeys();
  const exempt = getExemptTableKeys();
  const cascadeChildren = getCascadeChildTableKeys();
  const discovered = discoverUserOwnedTables();

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
