import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import { DATABASE_SHARDS } from '../../core/database/database-shards';
import {
  DESIRED_SCHEMAS,
  LOGICAL_DATABASE_LABELS,
  readDesiredSchema,
  type LogicalDatabaseLabel,
} from '../desired-schema/registry';
import { SCHEMA_SYNC_REPORT_PATH, schemaSyncReportPathFor } from './schema-sync-report-path';
import { credentialKeysFor, loadCredentialsFor } from './schema-credentials';
import { readTursoSchema } from './turso-schema-reader';
import { diffSchemas } from './schema-diff';
import { computeSchemaVersion } from './schema-version';
import type { SchemaSyncReport } from './types';

/**
 * Schema synchronization: the repository-owned desired manifest is the source,
 * a live Turso read-back is the target, and only additive DDL is ever applied.
 *
 * Nothing here opens a file-backed database. The desired side is TypeScript the
 * build already contains, which is what makes `db:schema:verify` runnable in a
 * build with no `.db` file and — offline — with no credentials either.
 */

/**
 * Objects a database is allowed to have that this label does not own.
 *
 * Two sources. Tables owned by a *different* logical database are ignored
 * because several labels historically shared one Turso database and a leftover
 * copy is not this label's business. `__drizzle_migrations` is drizzle-kit's own
 * journal: tooling bookkeeping, created and owned by the migrator, never
 * application schema.
 */
const TOOLING_OWNED_TABLES = new Set(['__drizzle_migrations']);

export function ignoredExtraTablesFor(databaseLabel: LogicalDatabaseLabel): Set<string> {
  const own = new Set(Object.keys(DESIRED_SCHEMAS[databaseLabel]?.tables ?? {}));
  const ignored = new Set<string>(TOOLING_OWNED_TABLES);
  for (const label of LOGICAL_DATABASE_LABELS) {
    if (label === databaseLabel) continue;
    for (const table of Object.keys(DESIRED_SCHEMAS[label].tables)) {
      if (!own.has(table)) ignored.add(table);
    }
  }
  // A shard map may name a table whose manifest has been removed with its
  // capability. Such a table surviving in a live database is historical residue,
  // not drift this label should try to reconcile.
  for (const tables of Object.values(DATABASE_SHARDS)) {
    for (const table of tables as readonly string[]) {
      if (!own.has(table)) ignored.add(table);
    }
  }
  return ignored;
}

export interface RunSchemaSyncOptions {
  /** When true, skip silently if Turso credentials are missing. */
  skipIfMissingCredentials?: boolean;
  tursoUrl?: string;
  tursoAuthToken?: string;
  /** Where to write the sync report JSON. */
  reportPath?: string;
  /** Which logical database to synchronize. */
  databaseLabel?: LogicalDatabaseLabel;
  /**
   * Compare only. No DDL is sent, and a difference is reported rather than
   * repaired. This is what a generic build and a developer machine run.
   */
  verifyOnly?: boolean;
  /** Drop objects Turso has that the manifest does not. Never implicit. */
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
    desiredSchemaVersion: 'n/a',
    tursoSchemaVersionBefore: 'n/a',
    tursoSchemaVersionAfter: 'n/a',
    operations: [],
    migrationsRequired: [],
    tablesModified: 0,
    columnsAdded: 0,
    indexesAdded: 0,
    viewsAdded: 0,
    triggersAdded: 0,
    sqlExecuted: [],
    residualOperations: [],
    errors: [],
    warnings: [],
    skipped: true,
    skipReason: reason,
  };
}

export async function runSchemaSync(options: RunSchemaSyncOptions = {}): Promise<SchemaSyncReport> {
  const startedAt = Date.now();
  const databaseLabel: LogicalDatabaseLabel = options.databaseLabel ?? 'users';
  const reportPath = options.reportPath ?? schemaSyncReportPathFor(databaseLabel);

  const credentials =
    options.tursoUrl && options.tursoAuthToken
      ? { url: options.tursoUrl, authToken: options.tursoAuthToken }
      : loadCredentialsFor(databaseLabel);

  if (!credentials) {
    const reason = `Turso credentials not configured for ${databaseLabel} (${credentialKeysFor(databaseLabel)})`;
    if (options.skipIfMissingCredentials) {
      const report = buildSkippedReport(reason);
      writeReport(reportPath, report);
      return report;
    }
    throw new Error(reason);
  }

  const desiredSchema = readDesiredSchema(databaseLabel);
  const desiredVersion = computeSchemaVersion(desiredSchema);
  const client = createClient({ url: credentials.url, authToken: credentials.authToken });

  const tursoSchemaBefore = await readTursoSchema(client as Parameters<typeof readTursoSchema>[0]);
  const tursoVersionBefore = computeSchemaVersion(tursoSchemaBefore);

  const diffOptions = {
    ignoredExtraTables: ignoredExtraTablesFor(databaseLabel),
    removeExtraObjects: options.removeExtraObjects,
  };
  const { operations, migrationsRequired, warnings } = diffSchemas(
    desiredSchema,
    tursoSchemaBefore,
    diffOptions,
  );
  const sqlExecuted: string[] = [];
  const errors: string[] = [];

  if (!options.verifyOnly) {
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
  }

  const tursoSchemaAfter = options.verifyOnly
    ? tursoSchemaBefore
    : await readTursoSchema(client as Parameters<typeof readTursoSchema>[0]);
  const tursoVersionAfter = options.verifyOnly
    ? tursoVersionBefore
    : computeSchemaVersion(tursoSchemaAfter);

  // Read-back verification. The diff above was computed against the schema as it was *before*
  // the writes, so on its own it can only report intent. Re-diffing the re-read schema is what
  // turns "the DDL was sent" into "the cloud matches the desired design", and it is the only
  // place a silently skipped operation — the `already exists` branch, or a statement the
  // provider accepted without effect — can still be caught before the release continues.
  const residualOperations = options.verifyOnly
    ? operations
    : diffSchemas(desiredSchema, tursoSchemaAfter, diffOptions).operations;

  const report: SchemaSyncReport = {
    executedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    desiredSchemaVersion: desiredVersion,
    tursoSchemaVersionBefore: tursoVersionBefore,
    tursoSchemaVersionAfter: tursoVersionAfter,
    operations,
    migrationsRequired,
    tablesModified: operations.filter((op) => op.type === 'CREATE_TABLE').length,
    columnsAdded: operations.filter((op) => op.type === 'ADD_COLUMN').length,
    indexesAdded: operations.filter((op) => op.type === 'CREATE_INDEX').length,
    viewsAdded: operations.filter((op) => op.type === 'CREATE_VIEW').length,
    triggersAdded: operations.filter((op) => op.type === 'CREATE_TRIGGER').length,
    sqlExecuted,
    residualOperations,
    errors,
    warnings,
    skipped: false,
  };

  writeReport(reportPath, report);

  if (errors.length > 0) {
    throw new Error(
      `Schema sync for ${databaseLabel} completed with ${errors.length} error(s). See ${reportPath}`,
    );
  }

  if (migrationsRequired.length > 0) {
    throw new Error(
      `Schema ${options.verifyOnly ? 'verification' : 'sync'} for ${databaseLabel} found ` +
        `${migrationsRequired.length} difference(s) additive DDL cannot repair:\n` +
        migrationsRequired.map((entry) => `  - ${entry.kind}: ${entry.description}`).join('\n') +
        `\nSQLite cannot alter a key, constraint or default in place. Write an explicit ` +
        `migration that rebuilds the table and moves its rows; provisioning will not guess one.`,
    );
  }

  if (residualOperations.length > 0) {
    throw new Error(
      options.verifyOnly
        ? `Schema verification for ${databaseLabel} found ${residualOperations.length} ` +
          `missing object(s) in Turso:\n` +
          residualOperations.map((operation) => `  - ${operation.description}`).join('\n') +
          `\nSee ${reportPath}. Run the authorized release schema apply to create them.`
        : `Schema sync for ${databaseLabel} reported success but ${residualOperations.length} ` +
          `difference(s) remain between the desired schema and Turso after the DDL was applied:\n` +
          residualOperations.map((operation) => `  - ${operation.description}`).join('\n') +
          `\nSee ${reportPath}. A release must never continue over a drifted cloud schema: the ` +
          `code that expects these objects would reach production before they do.`,
    );
  }

  return report;
}

export type AllSchemaSyncReports = Record<LogicalDatabaseLabel, SchemaSyncReport>;

/**
 * Synchronizes every logical database from its desired manifest.
 *
 * The set comes from the manifest registry, not from a hand-written list, so a
 * database can never be silently left out of a release.
 */
export async function runAllSchemaSyncs(
  options: Pick<
    RunSchemaSyncOptions,
    'skipIfMissingCredentials' | 'removeExtraObjects' | 'verifyOnly'
  > = {},
): Promise<AllSchemaSyncReports> {
  const reports = {} as AllSchemaSyncReports;
  for (const databaseLabel of LOGICAL_DATABASE_LABELS) {
    reports[databaseLabel] = await runSchemaSync({ ...options, databaseLabel });
  }
  return reports;
}

export function getSchemaSyncReportPath(): string {
  return SCHEMA_SYNC_REPORT_PATH;
}
