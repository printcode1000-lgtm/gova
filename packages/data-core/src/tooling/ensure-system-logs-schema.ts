export interface SystemLogsMigrationDatabase {
  prepare(sql: string): { all(): unknown[] };
  exec(sql: string): void;
}

export const SYSTEM_LOG_COMPATIBILITY_COLUMNS = [
  ['origin', "text NOT NULL DEFAULT 'client'"],
  ['trust_level', "text NOT NULL DEFAULT 'legacy'"],
  ['message_truncated', 'integer NOT NULL DEFAULT 0'],
  ['stack_truncated', 'integer NOT NULL DEFAULT 0'],
  ['correlation_id', "text NOT NULL DEFAULT ''"],
  ['request_flow_id', "text NOT NULL DEFAULT ''"],
  ['session_id', "text NOT NULL DEFAULT ''"],
  ['monitor_trace_id', "text NOT NULL DEFAULT ''"],
] as const;

export function missingSystemLogColumnStatements(
  existingColumns: ReadonlySet<string>,
): string[] {
  return SYSTEM_LOG_COMPATIBILITY_COLUMNS
    .filter(([name]) => !existingColumns.has(name))
    .map(([name, definition]) =>
      `ALTER TABLE system_logs ADD COLUMN ${name} ${definition}`,
    );
}

/** Idempotently upgrades an existing profile schema before shard splitting. */
export function ensureSystemLogsSchema(database: SystemLogsMigrationDatabase): void {
  const rows = database.prepare('PRAGMA table_info(system_logs)').all() as Array<{
    name?: unknown;
  }>;
  const existing = new Set(
    rows.map((row) => String(row.name ?? '')).filter(Boolean),
  );
  for (const statement of missingSystemLogColumnStatements(existing)) {
    database.exec(statement);
  }
  database.exec(
    'CREATE INDEX IF NOT EXISTS system_logs_origin_time_idx ON system_logs(origin, last_occurred_at)',
  );
  database.exec(
    'CREATE INDEX IF NOT EXISTS system_logs_correlation_idx ON system_logs(correlation_id)',
  );
}
