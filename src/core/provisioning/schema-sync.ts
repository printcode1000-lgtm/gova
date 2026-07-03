import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import {
  PROFILE_SCHEMA_SYNC_REPORT_PATH,
  SCHEMA_SYNC_REPORT_PATH,
  ADVERTISEMENTS_SQLITE_DB_PATH,
} from '@/core/database/environment';
import { getPrimarySqliteDbPath, getProfileSqliteDbPath } from '@/core/database/environment.server';
import { readSqliteSchema } from './sqlite-schema-reader';
import { readTursoSchema } from './turso-schema-reader';
import { diffSchemas } from './schema-diff';
import { computeSchemaVersion } from './schema-version';
import { loadTursoCredentialsFromEnv, loadTursoProfileCredentialsFromEnv, loadTursoAdvertisementsCredentialsFromEnv } from './turso-provisioner';
import type { SchemaSyncReport } from './types';

const ADVERTISEMENTS_SCHEMA_SYNC_REPORT_PATH = path.join(
  process.cwd(),
  'public',
  'sync_data',
  'advertisements-schema-sync-report.json',
);

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
}

function writeReport(reportPath: string, report: SchemaSyncReport): void {
  const dir = path.dirname(reportPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
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
      : databaseLabel === 'profile'
        ? loadTursoProfileCredentialsFromEnv()
        : databaseLabel === 'advertisements'
          ? loadTursoAdvertisementsCredentialsFromEnv()
          : loadTursoCredentialsFromEnv();

  if (!credentials) {
    const reason =
      databaseLabel === 'profile'
        ? 'Turso profile credentials not configured (TURSO_PROFILE_DATABASE_URL / TURSO_PROFILE_AUTH_TOKEN)'
        : databaseLabel === 'advertisements'
          ? 'Turso advertisements credentials not configured (TURSO_ADVERTISEMENTS_DATABASE_URL or TURSO_DATABASE_URL)'
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

  const { operations, warnings } = diffSchemas(sqliteSchema, tursoSchemaBefore);
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
  profile: SchemaSyncReport;
  advertisements: SchemaSyncReport;
}

/**
 * Syncs all SQLite sources → their respective Turso databases independently.
 * Includes: allusers.db → users, profile.db → profile, advertisements.db → advertisements.
 */
export async function runAllSchemaSyncs(
  options: Pick<RunSchemaSyncOptions, 'skipIfMissingCredentials'> = {}
): Promise<AllSchemaSyncReports> {
  const users = await runSchemaSync({
    ...options,
    sqlitePath: getPrimarySqliteDbPath(),
    reportPath: SCHEMA_SYNC_REPORT_PATH,
    databaseLabel: 'users',
  });

  const profile = await runSchemaSync({
    ...options,
    sqlitePath: getProfileSqliteDbPath(),
    reportPath: PROFILE_SCHEMA_SYNC_REPORT_PATH,
    databaseLabel: 'profile',
  });

  const advertisements = await runSchemaSync({
    ...options,
    sqlitePath: ADVERTISEMENTS_SQLITE_DB_PATH,
    reportPath: ADVERTISEMENTS_SCHEMA_SYNC_REPORT_PATH,
    databaseLabel: 'advertisements',
  });

  return { users, profile, advertisements };
}

export function getSchemaSyncReportPath(): string {
  return SCHEMA_SYNC_REPORT_PATH;
}
