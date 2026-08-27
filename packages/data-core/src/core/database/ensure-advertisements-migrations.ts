import { nodeRequire } from '../node-require';
import "server-only";

import path from "path";

import { ADVERTISEMENTS_SQLITE_DB_PATH } from "./environment";
import { readSqliteFileIdentity, type SqliteFileIdentity } from "./sqlite-file-identity";

// Keyed by file identity, not a boolean: a local rebuild puts a brand-new file at
// the same path, and that file needs the migrations applied again.
let migratedFile: SqliteFileIdentity = null;

export function ensureAdvertisementsDevMigrations(db: unknown): void {
  const fileIdentity = readSqliteFileIdentity(ADVERTISEMENTS_SQLITE_DB_PATH);
  if (fileIdentity !== null && fileIdentity === migratedFile) return;
  const { migrate } = nodeRequire("drizzle-orm/better-sqlite3/migrator");
  migrate(db, {
    migrationsFolder: path.join(
      process.cwd(),
      'packages', 'data-core', 'src',
      "core",
      "database",
      "advertisements",
      "migrations",
    ),
  });
  migratedFile = fileIdentity;
}
