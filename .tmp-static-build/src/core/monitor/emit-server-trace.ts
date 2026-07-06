import { isDevelopment } from '@/core/config';
import {
  getActiveQueryContext,
  getCurrentFlowId,
  getSessionId,
  useMonitorStore,
} from './monitor-store';
import { parseDevTraceHeader, type DevTraceLayer } from './dev-trace-types';
import type { LayerName, OperationRecord } from './types';

const TRACE_LAYER_MAP: Record<DevTraceLayer, LayerName> = {
  'business-api': 'gova-api',
  'server-service': 'service',
  'query-command': 'query',
  repository: 'repository',
  database: 'database',
};

export function emitServerTraceFromHeader(
  header: string | null,
  parentHttpId: string,
  httpStartedAt: number
): void {
  if (!isDevelopment || typeof window === 'undefined') return;

  const events = parseDevTraceHeader(header);
  if (events.length === 0) return;

  const ctx = getActiveQueryContext();
  const sessionId = getSessionId();
  const flowId = ctx?.requestFlowId ?? getCurrentFlowId();
  let offset = 0;

  for (const event of events) {
    const id = `srv-${parentHttpId}-${offset++}`;
    const startedAt = httpStartedAt + offset;
    const completedAt = startedAt + (event.executionTimeMs ?? 1);

    const record: OperationRecord = {
      id,
      correlationId: parentHttpId,
      parentId: parentHttpId,
      requestFlowId: flowId,
      sessionId,
      feature: ctx?.feature ?? 'unknown',
      page: ctx?.page ?? window.location.pathname,
      component: ctx?.component ?? 'unknown',
      hook: ctx?.hook ?? 'unknown',
      service: event.layer === 'server-service' ? event.name : ctx?.service ?? 'unknown',
      queryOrCommand: event.name,
      repository: event.layer === 'repository' ? event.name : ctx?.repository ?? 'unknown',
      dbDriver: 'SQLite-Dev',
      table: event.table ?? '',
      entity: ctx?.entity ?? '',
      operationType: event.operationType ?? 'UNKNOWN',
      sql: event.sql,
      monitorLayer: TRACE_LAYER_MAP[event.layer],
      status: event.status,
      errorMessage: event.errorMessage,
      timestamp: new Date().toISOString(),
      startedAt,
      completedAt,
      executionTime: event.executionTimeMs ?? 0,
      rowsRead: event.operationType === 'SELECT' ? 1 : 0,
      rowsWritten: event.operationType && event.operationType !== 'SELECT' ? 1 : 0,
      cacheSource: 'Database',
      cacheHit: false,
      refetchCount: 0,
      invalidationCount: 0,
      mutationCount: 0,
      pinned: false,
    };

    useMonitorStore.getState().emit(record);
  }
}
