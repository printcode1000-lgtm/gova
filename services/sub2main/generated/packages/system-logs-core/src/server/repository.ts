import {
  LIST_DEFAULT_LIMIT,
  LIST_MAX_LIMIT,
  MESSAGE_CLIP,
  STACK_CLIP,
} from '../domain/constants';
import { buildSystemLogFingerprint } from '../domain/fingerprint';
import type {
  PersistentSystemLogEntry,
  StoredSystemLogInput,
  SystemLogListOptions,
  SystemLogListPage,
  SystemLogSummary,
} from '../domain/entities';
import { systemLogsDatabase } from '../ports';

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `syslog_${crypto.randomUUID()}`;
  }
  return `syslog_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function clip(value: string | undefined, max: number) {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}...<truncated>` : value;
}

function rowToEntry(row: Record<string, unknown>): PersistentSystemLogEntry {
  return {
    id: String(row.id ?? ''),
    fingerprint: String(row.fingerprint ?? ''),
    level: row.level as PersistentSystemLogEntry['level'],
    source: row.source as PersistentSystemLogEntry['source'],
    consoleMethod: String(row.console_method ?? ''),
    message: String(row.message ?? ''),
    page: String(row.page ?? ''),
    platform: row.platform as PersistentSystemLogEntry['platform'],
    errorName: String(row.error_name ?? '') || undefined,
    sourceFile: String(row.source_file ?? '') || undefined,
    sourceLine:
      typeof row.source_line === 'number' ? row.source_line : undefined,
    sourceColumn:
      typeof row.source_column === 'number' ? row.source_column : undefined,
    userAgent: String(row.user_agent ?? '') || undefined,
    feature: String(row.feature ?? '') || undefined,
    operation: String(row.operation ?? '') || undefined,
    stack: String(row.stack ?? '') || undefined,
    routeName: String(row.route_name ?? '') || undefined,
    statusCode:
      typeof row.status_code === 'number' ? row.status_code : undefined,
    requestMethod: String(row.request_method ?? '') || undefined,
    appVersion: String(row.app_version ?? '') || undefined,
    nativeVersion: String(row.native_version ?? '') || undefined,
    uid: String(row.uid ?? '') || undefined,
    correlationId: String(row.correlation_id ?? '') || undefined,
    requestFlowId: String(row.request_flow_id ?? '') || undefined,
    sessionId: String(row.session_id ?? '') || undefined,
    monitorTraceId: String(row.monitor_trace_id ?? '') || undefined,
    origin: row.origin === 'cloud' ? 'cloud' : 'client',
    trustLevel:
      row.trust_level === 'trusted-server' ||
      row.trust_level === 'untrusted-client'
        ? row.trust_level
        : 'legacy',
    occurrences: Number(row.occurrences ?? 1),
    firstOccurredAt: String(row.first_occurred_at ?? ''),
    lastOccurredAt: String(row.last_occurred_at ?? ''),
    messageTruncated: Number(row.message_truncated ?? 0) === 1,
    stackTruncated: Number(row.stack_truncated ?? 0) === 1,
  };
}

export class SystemLogsRepository {
  private schemaReady = false;

  private async ensureColumn(name: string, definition: string) {
    const database = systemLogsDatabase();
    const columns = (await database.execute(
      'PRAGMA table_info(system_logs)',
    )) as Array<{ name?: string }>;
    if (columns.some((column) => column.name === name)) return;
    try {
      await database.execute(
        `ALTER TABLE system_logs ADD COLUMN ${name} ${definition}`,
      );
    } catch (error) {
      const refreshed = (await database.execute(
        'PRAGMA table_info(system_logs)',
      )) as Array<{ name?: string }>;
      if (!refreshed.some((column) => column.name === name)) throw error;
    }
  }

  async ensureSchema() {
    if (this.schemaReady) return;
    const database = systemLogsDatabase();
    await database.execute(`
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
        correlation_id text NOT NULL DEFAULT '',
        request_flow_id text NOT NULL DEFAULT '',
        session_id text NOT NULL DEFAULT '',
        monitor_trace_id text NOT NULL DEFAULT '',
        occurrences integer NOT NULL DEFAULT 1,
        first_occurred_at text NOT NULL,
        last_occurred_at text NOT NULL
      )
    `);
    await this.ensureColumn('origin', "text NOT NULL DEFAULT 'client'");
    await this.ensureColumn('trust_level', "text NOT NULL DEFAULT 'legacy'");
    await this.ensureColumn('message_truncated', 'integer NOT NULL DEFAULT 0');
    await this.ensureColumn('stack_truncated', 'integer NOT NULL DEFAULT 0');
    await this.ensureColumn('correlation_id', "text NOT NULL DEFAULT ''");
    await this.ensureColumn('request_flow_id', "text NOT NULL DEFAULT ''");
    await this.ensureColumn('session_id', "text NOT NULL DEFAULT ''");
    await this.ensureColumn('monitor_trace_id', "text NOT NULL DEFAULT ''");
    await database.execute(
      `UPDATE system_logs
       SET origin = 'cloud'
       WHERE trust_level = 'legacy'
         AND (platform = 'server' OR source IN ('server', 'api'))`,
    );
    await database.execute(
      'CREATE INDEX IF NOT EXISTS system_logs_level_time_idx ON system_logs(level, last_occurred_at)',
    );
    await database.execute(
      'CREATE INDEX IF NOT EXISTS system_logs_platform_time_idx ON system_logs(platform, last_occurred_at)',
    );
    await database.execute(
      'CREATE INDEX IF NOT EXISTS system_logs_feature_idx ON system_logs(feature, operation)',
    );
    await database.execute(
      'CREATE INDEX IF NOT EXISTS system_logs_origin_time_idx ON system_logs(origin, last_occurred_at)',
    );
    await database.execute(
      'CREATE INDEX IF NOT EXISTS system_logs_correlation_idx ON system_logs(correlation_id)',
    );
    this.schemaReady = true;
  }

  async add(input: StoredSystemLogInput) {
    await this.ensureSchema();
    const database = systemLogsDatabase();
    const now = nowIso();
    const key = buildSystemLogFingerprint(input);
    const id = createId();
    const rows = (await database.execute(
      `INSERT INTO system_logs (
        id, fingerprint, level, source, console_method, message, page, platform,
        error_name, source_file, source_line, source_column, user_agent, feature,
        operation, stack, route_name, status_code, request_method, app_version,
        native_version, uid, origin, trust_level, message_truncated,
        stack_truncated, correlation_id, request_flow_id, session_id,
        monitor_trace_id, occurrences, first_occurred_at, last_occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(fingerprint) DO UPDATE SET
        occurrences = system_logs.occurrences + 1,
        last_occurred_at = excluded.last_occurred_at,
        correlation_id = CASE
          WHEN excluded.correlation_id != '' THEN excluded.correlation_id
          ELSE system_logs.correlation_id
        END
      RETURNING id`,
      [
        id,
        key,
        input.level,
        input.source,
        input.consoleMethod,
        clip(input.message, MESSAGE_CLIP),
        clip(input.page, 1000),
        input.platform,
        clip(input.errorName, 200),
        clip(input.sourceFile, 1200),
        input.sourceLine ?? null,
        input.sourceColumn ?? null,
        clip(input.userAgent, 1200),
        clip(input.feature, 200),
        clip(input.operation, 300),
        clip(input.stack, STACK_CLIP),
        clip(input.routeName, 500),
        input.statusCode ?? null,
        clip(input.requestMethod, 20),
        clip(input.appVersion, 100),
        clip(input.nativeVersion, 100),
        clip(input.uid, 120),
        input.origin,
        input.trustLevel,
        input.message.length > MESSAGE_CLIP ? 1 : 0,
        (input.stack?.length ?? 0) > STACK_CLIP ? 1 : 0,
        clip(input.correlationId, 120),
        clip(input.requestFlowId, 120),
        clip(input.sessionId, 120),
        clip(input.monitorTraceId, 120),
        now,
        now,
      ],
    )) as Array<{ id: string }>;
    return rows[0]?.id ?? id;
  }

  async list(options: SystemLogListOptions = {}): Promise<SystemLogListPage> {
    await this.ensureSchema();
    const database = systemLogsDatabase();
    const limit = Math.max(
      1,
      Math.min(LIST_MAX_LIMIT, Math.floor(options.limit ?? LIST_DEFAULT_LIMIT)),
    );
    const filters: string[] = [];
    const params: unknown[] = [];

    if (options.origin) {
      filters.push('origin = ?');
      params.push(options.origin);
    }
    if (options.level) {
      filters.push('level = ?');
      params.push(options.level);
    }
    if (options.platform) {
      filters.push('platform = ?');
      params.push(options.platform);
    }
    if (options.feature) {
      filters.push('feature = ?');
      params.push(options.feature);
    }
    if (options.appVersion) {
      filters.push('app_version = ?');
      params.push(options.appVersion);
    }
    if (options.nativeVersion) {
      filters.push('native_version = ?');
      params.push(options.nativeVersion);
    }
    if (options.since) {
      filters.push('last_occurred_at >= ?');
      params.push(options.since);
    }
    if (options.until) {
      filters.push('last_occurred_at <= ?');
      params.push(options.until);
    }
    if (options.query?.trim()) {
      const q = `%${options.query.trim().toLowerCase()}%`;
      filters.push(
        `(LOWER(message) LIKE ? OR LOWER(feature) LIKE ? OR LOWER(operation) LIKE ? OR LOWER(route_name) LIKE ? OR LOWER(page) LIKE ? OR LOWER(stack) LIKE ? OR LOWER(correlation_id) LIKE ?)`,
      );
      params.push(q, q, q, q, q, q, q);
    }
    if (options.cursor) {
      const [cursorTime, cursorId] = options.cursor.split('|');
      if (cursorTime && cursorId) {
        filters.push(
          '(last_occurred_at < ? OR (last_occurred_at = ? AND id < ?))',
        );
        params.push(cursorTime, cursorTime, cursorId);
      }
    }

    const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
    const rows = (await database.execute(
      `SELECT * FROM system_logs${where} ORDER BY last_occurred_at DESC, id DESC LIMIT ?`,
      [...params, limit + 1],
    )) as Record<string, unknown>[];

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items = slice.map(rowToEntry);
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? `${last.lastOccurredAt}|${last.id}` : null;

    return { items, nextCursor, totalInPage: items.length };
  }

  async summary(): Promise<SystemLogSummary> {
    await this.ensureSchema();
    const database = systemLogsDatabase();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1_000).toISOString();

    const totals = (await database.execute(
      `SELECT
         SUM(CASE WHEN level = 'error' THEN occurrences ELSE 0 END) AS total_errors,
         SUM(CASE WHEN level = 'warning' THEN occurrences ELSE 0 END) AS total_warnings,
         SUM(CASE WHEN level = 'error' AND last_occurred_at >= ? THEN occurrences ELSE 0 END) AS last_hour_errors
       FROM system_logs`,
      [hourAgo],
    )) as Array<Record<string, unknown>>;

    const topFeatures = (await database.execute(
      `SELECT feature, SUM(occurrences) AS count
       FROM system_logs
       WHERE level = 'error' AND feature != ''
       GROUP BY feature
       ORDER BY count DESC
       LIMIT 5`,
    )) as Array<{ feature?: string; count?: number }>;

    const topFingerprints = (await database.execute(
      `SELECT fingerprint, message, occurrences, last_occurred_at
       FROM system_logs
       WHERE level = 'error'
       ORDER BY occurrences DESC, last_occurred_at DESC
       LIMIT 5`,
    )) as Array<Record<string, unknown>>;

    const byPlatformRows = (await database.execute(
      `SELECT platform, SUM(occurrences) AS count
       FROM system_logs
       WHERE level = 'error'
       GROUP BY platform`,
    )) as Array<{ platform?: string; count?: number }>;

    const byPlatform: Record<string, number> = {};
    for (const row of byPlatformRows) {
      if (row.platform) byPlatform[row.platform] = Number(row.count ?? 0);
    }

    const total = totals[0] ?? {};
    return {
      totalErrors: Number(total.total_errors ?? 0),
      totalWarnings: Number(total.total_warnings ?? 0),
      lastHourErrors: Number(total.last_hour_errors ?? 0),
      topFeatures: topFeatures.map((row) => ({
        feature: String(row.feature ?? 'unknown'),
        count: Number(row.count ?? 0),
      })),
      topFingerprints: topFingerprints.map((row) => ({
        fingerprint: String(row.fingerprint ?? ''),
        message: String(row.message ?? ''),
        occurrences: Number(row.occurrences ?? 0),
        lastOccurredAt: String(row.last_occurred_at ?? ''),
      })),
      byPlatform,
    };
  }

  async clear(level?: string) {
    await this.ensureSchema();
    const database = systemLogsDatabase();
    if (level) {
      await database.execute('DELETE FROM system_logs WHERE level = ?', [level]);
      return;
    }
    await database.execute('DELETE FROM system_logs');
  }

  async pruneOlderThan(cutoffIso: string) {
    await this.ensureSchema();
    const database = systemLogsDatabase();
    const result = (await database.execute(
      'DELETE FROM system_logs WHERE last_occurred_at < ?',
      [cutoffIso],
    )) as { changes?: number } | unknown[];
    if (Array.isArray(result)) return 0;
    return Number((result as { changes?: number }).changes ?? 0);
  }
}

export const systemLogsRepository = new SystemLogsRepository();
