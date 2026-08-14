import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import {
  SCHEMA_SYNC_REPORT_PATH,
  ADVERTISEMENTS_SQLITE_DB_PATH,
  NOTIFICATIONS_SQLITE_DB_PATH,
  PRODUCT_SQLITE_DB_PATH,
  SQLITE_DIRECTORY,
} from '@/modules/data-access/core/database/environment';
import { getPrimarySqliteDbPath } from '@/modules/data-access/core/database/environment.server';
import {
  DATABASE_SHARDS,
  DATABASE_SHARD_NAMES,
  envPrefixForShard,
  sqliteFileNameForShard,
} from '@/modules/data-access/core/database/database-shards';
import { readOptionalEnv } from '@/core/config/server-env.values';
import { readSqliteSchema } from '@/modules/data-access/provisioning/core/sqlite-schema-reader';
import { readTursoSchema } from '@/modules/data-access/provisioning/core/turso-schema-reader';
import { diffSchemas } from '@/modules/data-access/provisioning/core/schema-diff';
import { computeSchemaVersion } from '@/modules/data-access/provisioning/core/schema-version';
import { loadTursoCredentialsFromEnv, loadTursoAdvertisementsCredentialsFromEnv, loadTursoNotificationsCredentialsFromEnv, loadTursoProductCredentialsFromEnv } from '@/modules/data-access/provisioning/core/turso-provisioner';
import type { SchemaSyncReport } from '@/modules/data-access/provisioning/core/types';

const ADVERTISEMENTS_SCHEMA_SYNC_REPORT_PATH = path.join(
  process.cwd(),
  'public',
  'sync_data',
  'advertisements-schema-sync-report.json',
);

const PRODUCT_SCHEMA_SYNC_REPORT_PATH = path.join(
  process.cwd(),
  'public',
  'sync_data',
  'product-schema-sync-report.json',
);

const NOTIFICATIONS_SCHEMA_SYNC_REPORT_PATH = path.join(
  process.cwd(),
  'public',
  'sync_data',
  'notifications-schema-sync-report.json',
);

const LOGICAL_DATABASE_TABLES: Record<string, Set<string>> = {
  users: new Set([
    'users',
    'password_recovery_challenges',
    'ota_releases',
    'ota_release_audit',
    'feature_flags',
  ]),
  notifications: new Set([
    'user_notification_tokens',
    'user_notification_preferences',
  ]),
  advertisements: new Set(['hero_slider', 'featured_marquee', 'trending_ribbon']),
  product: new Set([
    'products',
    'product_reviews',
    'product_review_helpful',
    'product_review_replies',
    'pharmacy_profile_category_overrides',
    'pharmacy_profile_subcategory_overrides',
    'pharmacy_profile_product_overrides',
  ]),
  ...Object.fromEntries(
    Object.entries(DATABASE_SHARDS).map(([databaseName, tables]) => [
      databaseName,
      new Set(tables),
    ]),
  ),
};

function ignoredExtraTablesFor(databaseLabel: string): Set<string> {
  const own = LOGICAL_DATABASE_TABLES[databaseLabel] ?? new Set<string>();
  const ignored = new Set<string>();
  for (const [label, tables] of Object.entries(LOGICAL_DATABASE_TABLES)) {
    if (label === databaseLabel) continue;
    for (const table of tables) {
      if (!own.has(table)) ignored.add(table);
    }
  }
  return ignored;
}

export interface RunSchemaSyncOptions {
  /** When true, skip silently if Turso credentials are missing (local builds). */
  skipIfMissingCredentials?: boolean;
  tursoUrl?: string;
  tursoAuthToken?: string;
  /** SQLite file to use as schema source. Defaults to allusers.db. */
  sqlitePath?: string;
  /** Where to write the sync report JSON. */
  reportPath?: string;
  /** Label used in skip reasons and logs. */
  databaseLabel?: string;
  /** When true, drop extra Turso objects that do not exist in the SQLite schema source. */
  removeExtraObjects?: boolean;
}

function writeReport(reportPath: string, report: SchemaSyncReport): void {
  const dir = path.dirname(reportPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const contents = JSON.stringify(report, null, 2);
  const retryableWindowsErrors = new Set(['EBUSY', 'EACCES', 'EPERM', 'UNKNOWN']);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      writeFileSync(reportPath, contents, 'utf8');
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (process.platform !== 'win32' || !code || !retryableWindowsErrors.has(code) || attempt === 5) {
        throw error;
      }
      // Virus scanners and indexing services can hold freshly rewritten JSON
      // reports briefly on Windows. Keep schema sync deterministic instead of
      // failing an otherwise valid production build on that transient lock.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 100);
    }
  }
}

function buildSkippedReport(reason: string): SchemaSyncReport {
  return {
    executedAt: new Date().toISOString(),
    durationMs: 0,
    sqliteSchemaVersion: 'n/a',
    tursoSchemaVersionBefore: 'n/a',
    tursoSchemaVersionAfter: 'n/a',
    operations: [],
    tablesModified: 0,
    columnsAdded: 0,
    indexesAdded: 0,
    viewsAdded: 0,
    triggersAdded: 0,
    sqlExecuted: [],
    errors: [],
    warnings: [],
    skipped: true,
    skipReason: reason,
  };
}

/**
 * Schema Synchronization — compares one SQLite file (SSOT) with one Turso DB and applies
 * incremental DDL only. Never copies row data.
 */
export async function runSchemaSync(options: RunSchemaSyncOptions = {}): Promise<SchemaSyncReport> {
  const startedAt = Date.now();
  const databaseLabel = options.databaseLabel ?? 'users';
  const sqlitePath = options.sqlitePath ?? getPrimarySqliteDbPath();
  const reportPath = options.reportPath ?? SCHEMA_SYNC_REPORT_PATH;

  const credentials =
    options.tursoUrl && options.tursoAuthToken
      ? { url: options.tursoUrl, authToken: options.tursoAuthToken }
      : databaseLabel === 'advertisements'
          ? loadTursoAdvertisementsCredentialsFromEnv()
          : databaseLabel === 'product'
            ? loadTursoProductCredentialsFromEnv()
            : databaseLabel === 'notifications'
              ? loadTursoNotificationsCredentialsFromEnv()
              : DATABASE_SHARD_NAMES.includes(databaseLabel as any)
                ? loadTursoShardCredentialsFromEnv(databaseLabel)
                : loadTursoCredentialsFromEnv();

  if (!credentials) {
    const reason =
      databaseLabel === 'advertisements'
          ? 'Turso advertisements credentials not configured (TURSO_ADVERTISEMENTS_DATABASE_URL / TURSO_ADVERTISEMENTS_AUTH_TOKEN)'
          : databaseLabel === 'product'
            ? 'Turso product credentials not configured (TURSO_PRODUCT_DATABASE_URL / TURSO_PRODUCT_AUTH_TOKEN)'
            : databaseLabel === 'notifications'
              ? 'Turso notifications credentials not configured (TURSO_NOTIFICATIONS_DATABASE_URL / TURSO_NOTIFICATIONS_AUTH_TOKEN)'
              : DATABASE_SHARD_NAMES.includes(databaseLabel as any)
                ? `Turso shard credentials not configured (${envPrefixForShard(databaseLabel as any)}_DATABASE_URL / ${envPrefixForShard(databaseLabel as any)}_DATABASE_AUTH_TOKEN)`
                : 'Turso credentials not configured (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN)';
    if (options.skipIfMissingCredentials) {
      const report = buildSkippedReport(reason);
      writeReport(reportPath, report);
      return report;
    }
    throw new Error(reason);
  }

  if (!existsSync(sqlitePath)) {
    const reason = `SQLite schema source not found for ${databaseLabel}: ${sqlitePath}`;
    if (options.skipIfMissingCredentials) {
      const report = buildSkippedReport(reason);
      report.warnings.push(reason);
      writeReport(reportPath, report);
      return report;
    }
    throw new Error(reason);
  }

  let sqliteSchema;
  try {
    sqliteSchema = readSqliteSchema(sqlitePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const report = buildSkippedReport(message);
    report.errors.push(message);
    writeReport(reportPath, report);
    if (options.skipIfMissingCredentials) return report;
    throw error;
  }

  const sqliteVersion = computeSchemaVersion(sqliteSchema);
  const client = createClient({
    url: credentials.url,
    authToken: credentials.authToken,
  });

  const tursoSchemaBefore = await readTursoSchema(client as Parameters<typeof readTursoSchema>[0]);
  const tursoVersionBefore = computeSchemaVersion(tursoSchemaBefore);

  const { operations, warnings } = diffSchemas(sqliteSchema, tursoSchemaBefore, {
    ignoredExtraTables: ignoredExtraTablesFor(databaseLabel),
    removeExtraObjects: options.removeExtraObjects,
  });
  const sqlExecuted: string[] = [];
  const errors: string[] = [];

  for (const operation of operations) {
    try {
      await client.execute(operation.sql);
      sqlExecuted.push(operation.sql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('already exists')) {
        warnings.push(`Skipped (already exists): ${operation.description}`);
        continue;
      }
      errors.push(`${operation.description}: ${message}`);
    }
  }

  const tursoSchemaAfter = await readTursoSchema(client as Parameters<typeof readTursoSchema>[0]);
  const tursoVersionAfter = computeSchemaVersion(tursoSchemaAfter);

  const report: SchemaSyncReport = {
    executedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    sqliteSchemaVersion: sqliteVersion,
    tursoSchemaVersionBefore: tursoVersionBefore,
    tursoSchemaVersionAfter: tursoVersionAfter,
    operations,
    tablesModified: operations.filter((op) => op.type === 'CREATE_TABLE').length,
    columnsAdded: operations.filter((op) => op.type === 'ADD_COLUMN').length,
    indexesAdded: operations.filter((op) => op.type === 'CREATE_INDEX').length,
    viewsAdded: operations.filter((op) => op.type === 'CREATE_VIEW').length,
    triggersAdded: operations.filter((op) => op.type === 'CREATE_TRIGGER').length,
    sqlExecuted,
    errors,
    warnings,
    skipped: false,
  };

  writeReport(reportPath, report);

  if (errors.length > 0) {
    throw new Error(
      `Schema sync for ${databaseLabel} completed with ${errors.length} error(s). See ${reportPath}`
    );
  }

  return report;
}

export interface AllSchemaSyncReports {
  users: SchemaSyncReport;
  advertisements: SchemaSyncReport;
  product: SchemaSyncReport;
  notifications: SchemaSyncReport;
  shards: Record<string, SchemaSyncReport>;
}

function loadTursoShardCredentialsFromEnv(databaseLabel: string): { url: string; authToken: string } | null {
  const prefix = envPrefixForShard(databaseLabel as any);
  const url = readOptionalEnv(`${prefix}_DATABASE_URL`);
  const authToken = readOptionalEnv(`${prefix}_DATABASE_AUTH_TOKEN`);
  if (!url || !authToken) return null;
  return { url, authToken };
}

/**
 * Syncs all SQLite sources → their respective Turso databases independently.
 * Includes allusers, product, advertisements, and every profile/orders shard.
 */
export async function runAllSchemaSyncs(
  options: Pick<RunSchemaSyncOptions, 'skipIfMissingCredentials' | 'removeExtraObjects'> = {}
): Promise<AllSchemaSyncReports> {
  const users = await runSchemaSync({
    ...options,
    sqlitePath: getPrimarySqliteDbPath(),
    reportPath: SCHEMA_SYNC_REPORT_PATH,
    databaseLabel: 'users',
  });

  const advertisements = await runSchemaSync({
    ...options,
    sqlitePath: ADVERTISEMENTS_SQLITE_DB_PATH,
    reportPath: ADVERTISEMENTS_SCHEMA_SYNC_REPORT_PATH,
    databaseLabel: 'advertisements',
  });

  const product = await runSchemaSync({
    ...options,
    sqlitePath: PRODUCT_SQLITE_DB_PATH,
    reportPath: PRODUCT_SCHEMA_SYNC_REPORT_PATH,
    databaseLabel: 'product',
  });

  const notifications = await runSchemaSync({
    ...options,
    sqlitePath: NOTIFICATIONS_SQLITE_DB_PATH,
    reportPath: NOTIFICATIONS_SCHEMA_SYNC_REPORT_PATH,
    databaseLabel: 'notifications',
  });

  const shards: Record<string, SchemaSyncReport> = {};
  for (const databaseName of DATABASE_SHARD_NAMES) {
    shards[databaseName] = await runSchemaSync({
      ...options,
      sqlitePath: path.join(SQLITE_DIRECTORY, sqliteFileNameForShard(databaseName)),
      reportPath: path.join(process.cwd(), 'public', 'sync_data', `${databaseName}-schema-sync-report.json`),
      databaseLabel: databaseName,
    });
  }

  return { users, advertisements, product, notifications, shards };
}

export function getSchemaSyncReportPath(): string {
  return SCHEMA_SYNC_REPORT_PATH;
}
