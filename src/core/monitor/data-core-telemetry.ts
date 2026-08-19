/**
 * The seam between the developer monitor and `@asol/data-core`.
 *
 * This is the only module allowed to know both sides: it holds the monitor's event shape on
 * one hand and the package's port on the other. `@asol/data-core` declares what it needs to
 * announce (a statement, a server-layer hop, an IndexedDB operation) and nothing about how an
 * observation is recorded; everything below turns those announcements into `OperationRecord`s.
 *
 * Registration is a side effect of importing this module, so it must be imported from an entry
 * that runs before the first query — `src/instrumentation.ts` on the server, the query provider
 * in the browser. If that import is ever dropped the port keeps its safe defaults and the only
 * loss is trace lines in `/dev/monitor`.
 */
import { registerDataCoreTelemetry } from '@asol/data-core/telemetry';

import { isDevelopment } from '@/core/config';
import type { AsolDbStoreName } from '@asol/data-core/browser';
import { trackAsolDbOp } from '@/core/monitor/asol-db-monitor';
import {
  getActiveQueryContext,
  getCurrentFlowId,
  getSessionId,
  useMonitorStore,
} from '@/core/monitor/monitor-store';
import { inferOperationType, readMemory } from '@/core/monitor/types';

function extractTable(sql: string): string {
  const upper = sql.trim().toUpperCase();
  const from = /FROM\s+["'`]?(\w+)["'`]?/i;
  if (upper.startsWith('SELECT') || upper.startsWith('DELETE')) return sql.match(from)?.[1] ?? '';
  if (upper.startsWith('INSERT')) return sql.match(/INTO\s+["'`]?(\w+)["'`]?/i)?.[1] ?? '';
  if (upper.startsWith('UPDATE')) return sql.match(/UPDATE\s+["'`]?(\w+)["'`]?/i)?.[1] ?? '';
  return '';
}

export function registerMonitorTelemetry(): void {
  registerDataCoreTelemetry({
    isEnabled: () => isDevelopment,

    async traceDatabaseQuery(descriptor, action) {
      if (!isDevelopment) return action();

      const activeCtx = getActiveQueryContext();
      const id = `db-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const requestFlowId = activeCtx?.requestFlowId || getCurrentFlowId();
      const sessionId = getSessionId();
      const startedAt = performance.now();
      const memBefore = readMemory();
      const ts = new Date().toISOString();
      const operationType = inferOperationType(descriptor.sql);
      const table = descriptor.table || extractTable(descriptor.sql);

      const base = {
        id,
        correlationId: id,
        requestFlowId,
        sessionId,
        feature: activeCtx?.feature || 'unknown',
        page:
          activeCtx?.page ||
          (typeof window !== 'undefined' ? window.location.pathname : 'server'),
        component: activeCtx?.component || 'unknown',
        hook: activeCtx?.hook || 'unknown',
        service: activeCtx?.service || 'unknown',
        queryOrCommand: activeCtx?.queryOrCommand || 'unknown',
        repository: activeCtx?.repository || 'unknown',
        dbDriver: descriptor.driver as never,
        table,
        entity: activeCtx?.entity || 'unknown',
        operationType,
        sql: descriptor.sql,
        params: descriptor.params as unknown[],
        timestamp: ts,
        startedAt,
        memoryBefore: memBefore,
        cacheSource: 'Database' as const,
        cacheHit: false,
        refetchCount: 0,
        invalidationCount: 0,
        mutationCount: 0,
        pinned: false,
      };

      try {
        const result = await action();
        const completedAt = performance.now();
        const memAfter = readMemory();
        const rows = Array.isArray(result) ? result.length : 0;

        useMonitorStore.getState().emit({
          ...base,
          status: 'success',
          completedAt,
          executionTime: Math.round((completedAt - startedAt) * 100) / 100,
          rowsRead: operationType === 'SELECT' ? rows : 0,
          rowsWritten: operationType !== 'SELECT' && operationType !== 'UNKNOWN' ? 1 : 0,
          memoryAfter: memAfter,
          memoryDelta: memBefore != null && memAfter != null ? memAfter - memBefore : undefined,
        });

        return result;
      } catch (error) {
        const completedAt = performance.now();
        const memAfter = readMemory();

        useMonitorStore.getState().emit({
          ...base,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : String(error),
          executionStack: error instanceof Error ? error.stack : undefined,
          completedAt,
          executionTime: Math.round((completedAt - startedAt) * 100) / 100,
          rowsRead: 0,
          rowsWritten: 0,
          memoryAfter: memAfter,
          memoryDelta: memBefore != null && memAfter != null ? memAfter - memBefore : undefined,
        });

        throw error;
      }
    },

    traceBrowserDatabaseOperation(store, key, operation, action) {
      return trackAsolDbOp(store as AsolDbStoreName, key, operation as 'get' | 'set' | 'delete' | 'clear', action);
    },
  });
}
