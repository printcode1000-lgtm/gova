import 'server-only';

import { statSync } from 'node:fs';

/**
 * Identity of the SQLite file a cached connection is bound to.
 *
 * `null` means the path currently has no file — the database was removed and
 * has not been recreated yet.
 */
export type SqliteFileIdentity = string | null;

/**
 * Reads the device/inode pair behind a SQLite path.
 *
 * A cached `better-sqlite3` connection keeps writing to the inode it opened. A
 * local database rebuild (`db:create:*`, a cloud restore, a shard split) unlinks
 * that inode and puts a new file at the same path, and every later write on the
 * old handle fails with `SQLITE_READONLY: attempt to write a readonly database`
 * while reads still succeed against the orphaned inode — an inconsistency that
 * survives until the dev server restarts. Comparing this identity before reusing
 * a connection is what makes a rebuild reconnect instead.
 */
export function readSqliteFileIdentity(databasePath: string): SqliteFileIdentity {
  try {
    const stats = statSync(databasePath);
    return `${stats.dev}:${stats.ino}`;
  } catch {
    return null;
  }
}
