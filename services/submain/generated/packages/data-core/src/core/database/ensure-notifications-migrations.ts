import { nodeRequire } from '../node-require';
import 'server-only';

import path from 'path';
import { isDevRuntime, NOTIFICATIONS_SQLITE_DB_PATH } from './environment';
import { readSqliteFileIdentity, type SqliteFileIdentity } from './sqlite-file-identity';

// Keyed by file identity, not a boolean: a local rebuild puts a brand-new file at
// the same path, and that file needs the migrations applied again.
let migratedFile: SqliteFileIdentity = null;

/**
 * Applies Drizzle migrations to the local notifications SQLite database on the
 * first server request in development.
 */
export function ensureNotificationsDevMigrations(db: { db?: unknown } | unknown): void {
  if (!isDevRuntime()) return;
  const fileIdentity = readSqliteFileIdentity(NOTIFICATIONS_SQLITE_DB_PATH);
  if (fileIdentity !== null && fileIdentity === migratedFile) return;

  try {
    const { migrate } = nodeRequire('drizzle-orm/better-sqlite3/migrator');
    const database =
      db && typeof db === 'object' && 'db' in (db as object) ? (db as { db: unknown }).db : db;
    const migrationsFolder = path.join(
      process.cwd(),
      'packages', 'data-core', 'src',
      'core',
      'database',
      'notifications',
      'migrations',
    );

    migrate(database, { migrationsFolder });
    migratedFile = fileIdentity;
  } catch (error) {
    console.error('❌ Failed to run local notifications SQLite migrations:', error);
  }
}
