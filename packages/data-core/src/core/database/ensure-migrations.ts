import { nodeRequire } from '../node-require';
import 'server-only';

import path from 'path';
import { isDevRuntime, PRIMARY_SQLITE_DB_PATH } from './environment';
import { readSqliteFileIdentity, type SqliteFileIdentity } from './sqlite-file-identity';

// Keyed by file identity, not a boolean: a local rebuild puts a brand-new file at
// the same path, and that file needs the migrations applied again.
let migratedFile: SqliteFileIdentity = null;

/**
 * Applies Drizzle migrations to local SQLite on first server request in development.
 */
export function ensureDevMigrations(db: { db?: unknown } | unknown): void {
  if (!isDevRuntime()) return;
  const fileIdentity = readSqliteFileIdentity(PRIMARY_SQLITE_DB_PATH);
  if (fileIdentity !== null && fileIdentity === migratedFile) return;

  try {
    const { migrate } = nodeRequire('drizzle-orm/better-sqlite3/migrator');
    const database = db && typeof db === 'object' && 'db' in (db as object) ? (db as { db: unknown }).db : db;
    const migrationsFolder = path.join(process.cwd(), 'packages', 'data-core', 'src', 'core', 'database', 'migrations');

    migrate(database, { migrationsFolder });
    migratedFile = fileIdentity;
    console.log('✅ Local SQLite Drizzle migrations applied successfully!');
  } catch (error) {
    console.error('❌ Failed to run local SQLite migrations:', error);
  }
}
