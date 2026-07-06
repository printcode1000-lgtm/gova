import type { IDatabaseClient } from './database-client.interface';
import { inferOperationType, readMemory } from '@/core/monitor/types';
import { useMonitorStore, getSessionId, getCurrentFlowId, getActiveQueryContext } from '@/core/monitor/monitor-store';
import { isDevelopment } from '@/core/config';

export abstract class AbstractDatabaseClient implements IDatabaseClient {
  abstract get db(): any;
  abstract rawExecute(sql: string, params?: any[]): Promise<any[]>;

  async execute(sql: string, params?: any[]): Promise<any[]> {
    return this._trackedExecute(sql, params);
  }

  // ─── Instrumented execute wrapper ────────────────────────────────────────
  protected async _trackedExecute(sql: string, params: any[] = []): Promise<any[]> {
    if (!isDevelopment) {
      return this.rawExecute(sql, params);
    }

    const activeCtx = getActiveQueryContext();
    const id = `db-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const correlationId = id;
    const requestFlowId = activeCtx?.requestFlowId || getCurrentFlowId();
    const sessionId = getSessionId();
    const startedAt = performance.now();
    const memBefore = readMemory();
    const ts = new Date().toISOString();
    const operationType = inferOperationType(sql);
    const driver = this.constructor.name.includes('Turso')
      ? 'Turso-Production'
      : 'SQLite-Dev';

    try {
      const rows = await this.rawExecute(sql, params);
      const completedAt = performance.now();
      const memAfter = readMemory();
      const execTime = Math.round((completedAt - startedAt) * 100) / 100;

      useMonitorStore.getState().emit({
        id,
        correlationId,
        requestFlowId,
        sessionId,
        feature: activeCtx?.feature || 'unknown',
        page: activeCtx?.page || (typeof window !== 'undefined' ? window.location.pathname : 'server'),
        component: activeCtx?.component || 'unknown',
        hook: activeCtx?.hook || 'unknown',
        service: activeCtx?.service || 'unknown',
        queryOrCommand: activeCtx?.queryOrCommand || 'unknown',
        repository: activeCtx?.repository || 'unknown',
        dbDriver: driver as any,
        table: extractTable(sql),
        entity: activeCtx?.entity || 'unknown',
        operationType,
        sql,
        params,
        status: 'success',
        timestamp: ts,
        startedAt,
        completedAt,
        executionTime: execTime,
        rowsRead: operationType === 'SELECT' ? rows.length : 0,
        rowsWritten: operationType !== 'SELECT' && operationType !== 'UNKNOWN' ? 1 : 0,
        memoryBefore: memBefore,
        memoryAfter: memAfter,
        memoryDelta:
          memBefore != null && memAfter != null
            ? memAfter - memBefore
            : undefined,
        cacheSource: 'Database',
        cacheHit: false,
        refetchCount: 0,
        invalidationCount: 0,
        mutationCount: 0,
        pinned: false,
      });

      return rows;
    } catch (err: any) {
      const completedAt = performance.now();
      const memAfter = readMemory();
      const execTime = Math.round((completedAt - startedAt) * 100) / 100;

      useMonitorStore.getState().emit({
        id,
        correlationId,
        requestFlowId,
        sessionId,
        feature: activeCtx?.feature || 'unknown',
        page: activeCtx?.page || (typeof window !== 'undefined' ? window.location.pathname : 'server'),
        component: activeCtx?.component || 'unknown',
        hook: activeCtx?.hook || 'unknown',
        service: activeCtx?.service || 'unknown',
        queryOrCommand: activeCtx?.queryOrCommand || 'unknown',
        repository: activeCtx?.repository || 'unknown',
        dbDriver: driver as any,
        table: extractTable(sql),
        entity: activeCtx?.entity || 'unknown',
        operationType,
        sql,
        params,
        status: 'error',
        errorMessage: String(err?.message ?? err),
        executionStack: err?.stack,
        timestamp: ts,
        startedAt,
        completedAt,
        executionTime: execTime,
        rowsRead: 0,
        rowsWritten: 0,
        memoryBefore: memBefore,
        memoryAfter: memAfter,
        memoryDelta:
          memBefore != null && memAfter != null
            ? memAfter - memBefore
            : undefined,
        cacheSource: 'Database',
        cacheHit: false,
        refetchCount: 0,
        invalidationCount: 0,
        mutationCount: 0,
        pinned: false,
      });

      throw err;
    }
  }

  // ─── Helper methods that call _trackedExecute ─────────────────────────────
  async insert(table: string, data: Record<string, any>): Promise<any> {
    const keys = Object.keys(data);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const params = Object.values(data);
    return this._trackedExecute(sql, params);
  }

  async select(table: string, where: Record<string, any>, limit?: number): Promise<any[]> {
    const keys = Object.keys(where);
    const conditions = keys.map((key) =>
      where[key] === null ? `${key} IS NULL` : `${key} = ?`
    );
    const whereClause = keys.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = limit ? `LIMIT ${limit}` : '';
    const sql = `SELECT * FROM ${table} ${whereClause} ${limitClause}`.trim();
    const params = Object.values(where).filter((v) => v !== null);
    return this._trackedExecute(sql, params);
  }

  async update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<any> {
    const setKeys = Object.keys(data);
    const setClause = setKeys.map((key) => `${key} = ?`).join(', ');
    const whereKeys = Object.keys(where);
    const whereConditions = whereKeys.map((key) =>
      where[key] === null ? `${key} IS NULL` : `${key} = ?`
    );
    const whereClause = whereKeys.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const sql = `UPDATE ${table} SET ${setClause} ${whereClause}`;
    const params = [
      ...Object.values(data),
      ...Object.values(where).filter((v) => v !== null),
    ];
    return this._trackedExecute(sql, params);
  }

  async delete(table: string, where: Record<string, any>): Promise<any> {
    const keys = Object.keys(where);
    const conditions = keys.map((key) =>
      where[key] === null ? `${key} IS NULL` : `${key} = ?`
    );
    const whereClause = keys.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `DELETE FROM ${table} ${whereClause}`;
    const params = Object.values(where).filter((v) => v !== null);
    return this._trackedExecute(sql, params);
  }
}

// ─── Utility: extract table name from SQL ─────────────────────────────────────
function extractTable(sql: string): string {
  const upper = sql.trim().toUpperCase();
  if (upper.startsWith('SELECT')) {
    const m = sql.match(/FROM\s+["'`]?(\w+)["'`]?/i);
    return m?.[1] ?? '';
  }
  if (upper.startsWith('INSERT')) {
    const m = sql.match(/INTO\s+["'`]?(\w+)["'`]?/i);
    return m?.[1] ?? '';
  }
  if (upper.startsWith('UPDATE')) {
    const m = sql.match(/UPDATE\s+["'`]?(\w+)["'`]?/i);
    return m?.[1] ?? '';
  }
  if (upper.startsWith('DELETE')) {
    const m = sql.match(/FROM\s+["'`]?(\w+)["'`]?/i);
    return m?.[1] ?? '';
  }
  return '';
}
