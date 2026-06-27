import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import { SCHEMA_SYNC_REPORT_PATH } from '@/core/database/environment';
import { readSqliteSchema } from './sqlite-schema-reader';
import { readTursoSchema } from './turso-schema-reader';
import { diffSchemas } from './schema-diff';
import { computeSchemaVersion } from './schema-version';
import { loadTursoCredentialsFromEnv } from './turso-provisioner';
import type { SchemaSyncReport } from './types';

export interface RunSchemaSyncOptions {
  /** When true, skip silently if Turso credentials are missing (local builds). */
  skipIfMissingCredentials?: boolean;
  tursoUrl?: string;
  tursoAuthToken?: string;
}

function writeReport(report: SchemaSyncReport): void {
  const dir = path.dirname(SCHEMA_SYNC_REPORT_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(SCHEMA_SYNC_REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
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
 * Schema Synchronization — compares SQLite (SSOT) with Turso and applies
 * incremental DDL only. Never copies row data.
 */
export async function runSchemaSync(options: RunSchemaSyncOptions = {}): Promise<SchemaSyncReport> {
  const startedAt = Date.now();

  const credentials =
    options.tursoUrl && options.tursoAuthToken
      ? { url: options.tursoUrl, authToken: options.tursoAuthToken }
      : loadTursoCredentialsFromEnv();

  if (!credentials) {
    const reason = 'Turso credentials not configured (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN)';
    if (options.skipIfMissingCredentials) {
      const report = buildSkippedReport(reason);
      writeReport(report);
      return report;
    }
    throw new Error(reason);
  }

  let sqliteSchema;
  try {
    sqliteSchema = readSqliteSchema();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const report = buildSkippedReport(message);
    report.errors.push(message);
    writeReport(report);
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

  writeReport(report);

  if (errors.length > 0) {
    throw new Error(`Schema sync completed with ${errors.length} error(s). See schema-sync-report.json`);
  }

  return report;
}

export function getSchemaSyncReportPath(): string {
  return SCHEMA_SYNC_REPORT_PATH;
}
