import assert from "node:assert/strict";
import Database from "better-sqlite3";

import type { IDatabaseClient } from "@/modules/data-access/core/database/database-client.interface";
import { PersistentSystemLogRepository } from "@/modules/data-access/domains/system-logs/repositories/persistent-system-log-repository";
import { sanitizePersistentSystemLog } from "@/features/system-logs/system-log-sanitizer";

class MemoryDatabaseClient implements IDatabaseClient {
  readonly db = new Database(":memory:");

  async execute(sql: string, params: unknown[] = []) {
    const statement = this.db.prepare(sql);
    if (statement.reader) return statement.all(...params);
    statement.run(...params);
    return [];
  }

  async insert() {
    throw new Error("not implemented");
  }

  async select() {
    throw new Error("not implemented");
  }

  async update() {
    throw new Error("not implemented");
  }

  async delete() {
    throw new Error("not implemented");
  }
}

async function main() {
  const database = new MemoryDatabaseClient();

  database.db.exec(`
  CREATE TABLE system_logs (
    id text PRIMARY KEY NOT NULL,
    fingerprint text NOT NULL UNIQUE,
    level text NOT NULL,
    source text NOT NULL,
    console_method text NOT NULL DEFAULT '',
    message text NOT NULL,
    page text NOT NULL DEFAULT '',
    platform text NOT NULL DEFAULT 'server',
    error_name text NOT NULL DEFAULT '',
    source_file text NOT NULL DEFAULT '',
    source_line integer,
    source_column integer,
    user_agent text NOT NULL DEFAULT '',
    feature text NOT NULL DEFAULT '',
    operation text NOT NULL DEFAULT '',
    stack text NOT NULL DEFAULT '',
    route_name text NOT NULL DEFAULT '',
    status_code integer,
    request_method text NOT NULL DEFAULT '',
    app_version text NOT NULL DEFAULT '',
    native_version text NOT NULL DEFAULT '',
    uid text NOT NULL DEFAULT '',
    occurrences integer NOT NULL DEFAULT 1,
    first_occurred_at text NOT NULL,
    last_occurred_at text NOT NULL
  );
  INSERT INTO system_logs (
    id, fingerprint, level, source, console_method, message, platform,
    first_occurred_at, last_occurred_at
  ) VALUES (
    'legacy-server', 'legacy-fingerprint', 'error', 'server', 'server.error',
    'legacy cloud failure', 'server', '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
  );
`);

  const repository = new PersistentSystemLogRepository(database);

  const migrated = await repository.list({ origin: "cloud", level: "error" });
  assert.equal(
    migrated.length,
    1,
    "legacy server errors must migrate to cloud",
  );
  assert.equal(migrated[0]?.trustLevel, "legacy");
  assert.equal(migrated[0]?.messageTruncated, false);

  await repository.add(
    sanitizePersistentSystemLog(
      {
        level: "error",
        source: "api",
        consoleMethod: "server.error",
        message: "authorization: Bearer private-token",
        page: "/api/orders",
        platform: "server",
        routeName: "POST /api/orders",
        statusCode: 500,
        requestMethod: "POST",
        stack: "x".repeat(12_100),
      },
      "trusted-server",
    ),
  );

  await repository.add(
    sanitizePersistentSystemLog(
      {
        level: "error",
        source: "server",
        consoleMethod: "client.error",
        message: "client failure",
        page: "/login",
        platform: "server",
      },
      "untrusted-client",
    ),
  );

  const cloud = await repository.list({ origin: "cloud", level: "error" });
  const trusted = cloud.find((entry) => entry.trustLevel === "trusted-server");
  assert.ok(trusted, "trusted server error must be queryable as cloud");
  assert.equal(trusted.source, "api");
  assert.equal(trusted.message.includes("private-token"), false);
  assert.equal(trusted.stackTruncated, true);

  const client = await repository.list({ origin: "client", level: "error" });
  assert.equal(client.length, 1);
  assert.equal(client[0]?.source, "client");
  assert.equal(client[0]?.platform, "web");
  assert.equal(client[0]?.trustLevel, "untrusted-client");

  database.db.close();
  console.log("persistent system-log repository tests passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
