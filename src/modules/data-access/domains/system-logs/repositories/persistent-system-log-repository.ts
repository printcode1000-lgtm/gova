import { profilesDataSource } from "@/modules/data-access/core";
import "server-only";

import type { IDatabaseClient } from "@/modules/data-access/core/database/database-client.interface";
import type {
  PersistentSystemLogEntry,
  PersistentSystemLogListOptions,
  StoredPersistentSystemLogInput,
} from "@/features/system-logs/entities/persistent-system-log.entity";

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `syslog_${crypto.randomUUID()}`;
  }
  return `syslog_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function clip(value: string | undefined, max: number) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}...<truncated>` : value;
}

function fingerprint(input: StoredPersistentSystemLogInput) {
  return [
    input.origin,
    input.trustLevel,
    input.level,
    input.source,
    input.consoleMethod,
    input.message,
    input.page,
    input.platform,
    input.errorName ?? "",
    input.sourceFile ?? "",
    input.sourceLine ?? "",
    input.sourceColumn ?? "",
    input.feature ?? "",
    input.operation ?? "",
    input.routeName ?? "",
    clip(input.stack, 2000),
  ].join("\u001f");
}

function rowToEntry(row: Record<string, unknown>): PersistentSystemLogEntry {
  return {
    id: String(row.id ?? ""),
    fingerprint: String(row.fingerprint ?? ""),
    level: row.level as PersistentSystemLogEntry["level"],
    source: row.source as PersistentSystemLogEntry["source"],
    consoleMethod: String(row.console_method ?? ""),
    message: String(row.message ?? ""),
    page: String(row.page ?? ""),
    platform: row.platform as PersistentSystemLogEntry["platform"],
    errorName: String(row.error_name ?? "") || undefined,
    sourceFile: String(row.source_file ?? "") || undefined,
    sourceLine:
      typeof row.source_line === "number" ? row.source_line : undefined,
    sourceColumn:
      typeof row.source_column === "number" ? row.source_column : undefined,
    userAgent: String(row.user_agent ?? "") || undefined,
    feature: String(row.feature ?? "") || undefined,
    operation: String(row.operation ?? "") || undefined,
    stack: String(row.stack ?? "") || undefined,
    routeName: String(row.route_name ?? "") || undefined,
    statusCode:
      typeof row.status_code === "number" ? row.status_code : undefined,
    requestMethod: String(row.request_method ?? "") || undefined,
    appVersion: String(row.app_version ?? "") || undefined,
    nativeVersion: String(row.native_version ?? "") || undefined,
    uid: String(row.uid ?? "") || undefined,
    origin: row.origin === "cloud" ? "cloud" : "client",
    trustLevel:
      row.trust_level === "trusted-server" ||
      row.trust_level === "untrusted-client"
        ? row.trust_level
        : "legacy",
    occurrences: Number(row.occurrences ?? 1),
    firstOccurredAt: String(row.first_occurred_at ?? ""),
    lastOccurredAt: String(row.last_occurred_at ?? ""),
    messageTruncated: Number(row.message_truncated ?? 0) === 1,
    stackTruncated: Number(row.stack_truncated ?? 0) === 1,
  };
}

export class PersistentSystemLogRepository {
  private schemaReady = false;

  constructor(private database: IDatabaseClient = profilesDataSource) {}

  private async ensureColumn(name: string, definition: string) {
    const columns = (await this.database.execute(
      "PRAGMA table_info(system_logs)",
    )) as Array<{ name?: string }>;
    if (columns.some((column) => column.name === name)) return;
    try {
      await this.database.execute(
        `ALTER TABLE system_logs ADD COLUMN ${name} ${definition}`,
      );
    } catch (error) {
      // Two cold server instances may race the same additive migration.
      const refreshed = (await this.database.execute(
        "PRAGMA table_info(system_logs)",
      )) as Array<{ name?: string }>;
      if (!refreshed.some((column) => column.name === name)) throw error;
    }
  }

  private async ensureSchema() {
    if (this.schemaReady) return;
    await this.database.execute(`
      CREATE TABLE IF NOT EXISTS system_logs (
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
        occurrences integer NOT NULL DEFAULT 1,
        first_occurred_at text NOT NULL,
        last_occurred_at text NOT NULL
      )
    `);
    await this.ensureColumn("origin", "text NOT NULL DEFAULT 'client'");
    await this.ensureColumn("trust_level", "text NOT NULL DEFAULT 'legacy'");
    await this.ensureColumn("message_truncated", "integer NOT NULL DEFAULT 0");
    await this.ensureColumn("stack_truncated", "integer NOT NULL DEFAULT 0");
    await this.database.execute(
      `UPDATE system_logs
       SET origin = 'cloud'
       WHERE trust_level = 'legacy'
         AND (platform = 'server' OR source IN ('server', 'api'))`,
    );
    await this.database.execute(
      "CREATE INDEX IF NOT EXISTS system_logs_level_time_idx ON system_logs(level, last_occurred_at)",
    );
    await this.database.execute(
      "CREATE INDEX IF NOT EXISTS system_logs_platform_time_idx ON system_logs(platform, last_occurred_at)",
    );
    await this.database.execute(
      "CREATE INDEX IF NOT EXISTS system_logs_feature_idx ON system_logs(feature, operation)",
    );
    await this.database.execute(
      "CREATE INDEX IF NOT EXISTS system_logs_origin_time_idx ON system_logs(origin, last_occurred_at)",
    );
    this.schemaReady = true;
  }

  async add(input: StoredPersistentSystemLogInput) {
    await this.ensureSchema();
    const now = nowIso();
    const key = fingerprint(input);
    const existing = (await this.database.execute(
      "SELECT id, occurrences FROM system_logs WHERE fingerprint = ? LIMIT 1",
      [key],
    )) as Array<{ id: string; occurrences: number }>;
    if (existing[0]) {
      await this.database.execute(
        "UPDATE system_logs SET occurrences = ?, last_occurred_at = ? WHERE id = ?",
        [Number(existing[0].occurrences ?? 1) + 1, now, existing[0].id],
      );
      return existing[0].id;
    }
    const id = createId();
    await this.database.execute(
      `INSERT INTO system_logs (
        id, fingerprint, level, source, console_method, message, page, platform,
        error_name, source_file, source_line, source_column, user_agent, feature,
        operation, stack, route_name, status_code, request_method, app_version,
        native_version, uid, origin, trust_level, message_truncated,
        stack_truncated, occurrences, first_occurred_at, last_occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        key,
        input.level,
        input.source,
        input.consoleMethod,
        clip(input.message, 8000),
        clip(input.page, 1000),
        input.platform,
        clip(input.errorName, 200),
        clip(input.sourceFile, 1200),
        input.sourceLine ?? null,
        input.sourceColumn ?? null,
        clip(input.userAgent, 1200),
        clip(input.feature, 200),
        clip(input.operation, 300),
        clip(input.stack, 12000),
        clip(input.routeName, 500),
        input.statusCode ?? null,
        clip(input.requestMethod, 20),
        clip(input.appVersion, 100),
        clip(input.nativeVersion, 100),
        clip(input.uid, 120),
        input.origin,
        input.trustLevel,
        input.message.length > 8000 ? 1 : 0,
        (input.stack?.length ?? 0) > 12000 ? 1 : 0,
        now,
        now,
      ],
    );
    return id;
  }

  async list(
    options: PersistentSystemLogListOptions = {},
  ): Promise<PersistentSystemLogEntry[]> {
    await this.ensureSchema();
    const limit = Math.max(1, Math.min(1000, Math.floor(options.limit ?? 300)));
    const filters: string[] = [];
    const params: unknown[] = [];
    if (options.origin) {
      filters.push("origin = ?");
      params.push(options.origin);
    }
    if (options.level) {
      filters.push("level = ?");
      params.push(options.level);
    }
    const where = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";
    const rows = (await this.database.execute(
      `SELECT * FROM system_logs${where} ORDER BY last_occurred_at DESC LIMIT ?`,
      [...params, limit],
    )) as Record<string, unknown>[];
    return rows.map(rowToEntry);
  }

  async clear(level?: string) {
    await this.ensureSchema();
    if (level) {
      await this.database.execute("DELETE FROM system_logs WHERE level = ?", [
        level,
      ]);
      return;
    }
    await this.database.execute("DELETE FROM system_logs");
  }
}

export const persistentSystemLogRepository =
  new PersistentSystemLogRepository();
