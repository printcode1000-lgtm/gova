import assert from "node:assert/strict";
import Database from "better-sqlite3";

import { sanitizePersistentSystemLog } from "@asol/system-logs-core";
import { SystemLogsRepository } from "../system-logs.repository.server";

class MemoryDatabasePort {
  readonly db = new Database(":memory:");

  async execute(sql: string, params: unknown[] = []) {
    const statement = this.db.prepare(sql);
    if (statement.reader) return statement.all(...params);
    const result = statement.run(...params);
    return result;
  }
}

async function main() {
  const database = new MemoryDatabasePort();
  const systemLogsRepository = new SystemLogsRepository(database);

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
    origin text NOT NULL DEFAULT 'client',
    trust_level text NOT NULL DEFAULT 'legacy',
    message_truncated integer NOT NULL DEFAULT 0,
    stack_truncated integer NOT NULL DEFAULT 0,
    correlation_id text NOT NULL DEFAULT '',
    request_flow_id text NOT NULL DEFAULT '',
    session_id text NOT NULL DEFAULT '',
    monitor_trace_id text NOT NULL DEFAULT '',
    occurrences integer NOT NULL DEFAULT 1,
    first_occurred_at text NOT NULL,
    last_occurred_at text NOT NULL
  );
  INSERT INTO system_logs (
    id, fingerprint, level, source, console_method, message, platform,
    origin, trust_level, first_occurred_at, last_occurred_at
  ) VALUES (
    'legacy-server', 'legacy-fingerprint', 'error', 'server', 'server.error',
    'legacy cloud failure', 'server', 'client', 'legacy',
    '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
  );
`);

  const migrated = await systemLogsRepository.list({
    origin: "cloud",
    level: "error",
  });
  assert.equal(migrated.items.length, 1, "legacy server errors must migrate to cloud");
  assert.equal(migrated.items[0]?.trustLevel, "legacy");

  await systemLogsRepository.add(
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
        correlationId: "corr-test",
      },
      "trusted-server",
    ),
  );

  const stored = await systemLogsRepository.list({ origin: "cloud", level: "error" });
  assert.ok(stored.items.length >= 2);
  const latest = stored.items[0];
  assert.equal(latest?.stackTruncated, true);
  assert.equal(latest?.message.includes("private-token"), false);
  assert.equal(latest?.correlationId, "corr-test");

  console.log("Persistent system log repository tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
