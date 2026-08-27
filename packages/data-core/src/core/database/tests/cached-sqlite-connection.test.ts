import assert from "node:assert/strict";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { CachedSqliteConnection } from "../cached-sqlite-connection";
import { readSqliteFileIdentity } from "../sqlite-file-identity";

/**
 * Pins the reconnect behaviour behind every local SQLite adapter.
 *
 * A cached `better-sqlite3` handle keeps writing to the inode it opened. Local
 * database rebuilds — `db:create:*`, a cloud restore, a shard split — unlink that
 * inode and put a new file at the same path, and the dev server then read stale
 * rows and failed every write with `SQLITE_READONLY: attempt to write a readonly
 * database` until it was restarted. The symptom surfaced far from here (a 500 on
 * POST /api/notifications/device-token), so the contract is pinned in this file.
 */

const directory = mkdtempSync(path.join(tmpdir(), "asol-sqlite-reconnect-"));
const databasePath = path.join(directory, "probe.db");

function open(): CachedSqliteConnection<any> {
  return new CachedSqliteConnection(
    databasePath,
    (file) => {
      const sqlite = new Database(file);
      sqlite.prepare("CREATE TABLE IF NOT EXISTS probe (value TEXT)").run();
      return sqlite;
    },
    (sqlite) => sqlite,
  );
}

try {
  const connection = open();

  const first = connection.get();
  first.prepare("INSERT INTO probe (value) VALUES (?)").run("before");
  assert.equal(
    connection.get(),
    first,
    "an untouched file must reuse the cached connection",
  );

  const replacedIdentity = (() => {
    rmSync(databasePath);
    const rebuilt = new Database(databasePath);
    rebuilt.prepare("CREATE TABLE probe (value TEXT)").run();
    rebuilt.close();
    return readSqliteFileIdentity(databasePath);
  })();
  assert.notEqual(
    replacedIdentity,
    null,
    "the rebuilt database file must exist on disk",
  );

  const second = connection.get();
  assert.notEqual(
    second,
    first,
    "a replaced file must produce a new connection, not the orphaned handle",
  );

  // The write that used to fail with SQLITE_READONLY.
  second.prepare("INSERT INTO probe (value) VALUES (?)").run("after");
  const rows = second.prepare("SELECT value FROM probe").all() as Array<{
    value: string;
  }>;
  assert.deepEqual(
    rows.map((row) => row.value),
    ["after"],
    "the reconnected handle must read and write the file that is on disk now",
  );
  assert.equal(
    `${statSync(databasePath).dev}:${statSync(databasePath).ino}`,
    replacedIdentity,
    "the reconnect must not replace the file it reopened",
  );

  console.log(
    "Cached SQLite connection: reuse on an untouched file, reconnect after a rebuild.",
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
