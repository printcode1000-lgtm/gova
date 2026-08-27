import 'server-only';

import { readSqliteFileIdentity, type SqliteFileIdentity } from './sqlite-file-identity';

/**
 * A lazily opened SQLite connection that reopens when the file behind it is
 * replaced.
 *
 * Every local database adapter used to cache its connection forever. That is
 * correct until a local rebuild — `db:create:*`, a cloud restore, a shard split —
 * unlinks the file and writes a new one at the same path: the cached handle stays
 * bound to the unlinked inode, reads keep returning stale rows, and writes fail
 * with `SQLITE_READONLY: attempt to write a readonly database` until the dev
 * server restarts. This wrapper compares the file identity before handing back a
 * cached value, so a rebuild costs one reconnect instead of a broken server.
 */
export class CachedSqliteConnection<TValue> {
  private value: TValue | null = null;
  private sqlite: any = null;
  private fileIdentity: SqliteFileIdentity = null;

  constructor(
    private readonly databasePath: string,
    private readonly openSqlite: (databasePath: string) => any,
    private readonly wrap: (sqlite: any) => TValue,
  ) {}

  get(): TValue {
    const identity = readSqliteFileIdentity(this.databasePath);
    if (this.value !== null && identity !== null && identity === this.fileIdentity) {
      return this.value;
    }
    this.close();
    const sqlite = this.openSqlite(this.databasePath);
    this.sqlite = sqlite;
    // Read the identity after opening: `better-sqlite3` creates the file when it
    // is missing, so the pre-open read would have cached `null` and reconnected
    // on every single query.
    this.fileIdentity = readSqliteFileIdentity(this.databasePath);
    this.value = this.wrap(sqlite);
    return this.value;
  }

  private close(): void {
    try {
      this.sqlite?.close();
    } catch {
      // The handle already points at an unlinked inode; nothing left to release.
    }
    this.sqlite = null;
    this.value = null;
    this.fileIdentity = null;
  }
}
