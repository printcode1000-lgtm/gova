import { nodeRequire } from '../node-require';
import 'server-only';

import path from 'node:path';
import { isDevRuntime, PRODUCT_SQLITE_DB_PATH } from './environment';
import { readSqliteFileIdentity, type SqliteFileIdentity } from './sqlite-file-identity';

// Keyed by file identity, not a boolean: a local rebuild puts a brand-new file at
// the same path, and that file needs the migrations applied again.
let migratedFile: SqliteFileIdentity = null;

export function ensureProductDevMigrations(db: { db?: unknown } | unknown): void {
  if (!isDevRuntime()) return;
  const fileIdentity = readSqliteFileIdentity(PRODUCT_SQLITE_DB_PATH);
  if (fileIdentity !== null && fileIdentity === migratedFile) return;
  const { migrate } = nodeRequire('drizzle-orm/better-sqlite3/migrator');
  const database = db && typeof db === 'object' && 'db' in db ? (db as { db: unknown }).db : db;
  migrate(database, {
    migrationsFolder: path.join(process.cwd(), 'packages', 'data-core', 'src', 'core', 'database', 'product', 'migrations'),
  });
  migratedFile = fileIdentity;
}
