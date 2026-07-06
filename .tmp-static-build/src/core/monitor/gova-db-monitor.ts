import { isDevelopment } from '@/core/config';
import {
  getActiveQueryContext,
  getCurrentFlowId,
  getSessionId,
  useMonitorStore,
} from './monitor-store';
import type { GovaDbStoreName } from '@/lib/gova-db';
import type { OperationRecord, OperationType } from './types';

type GovaDbOp = 'get' | 'set' | 'delete' | 'clear';

function shouldTrack(): boolean {
  return typeof window !== 'undefined' && isDevelopment;
}

function inferOpType(op: GovaDbOp): OperationType {
  if (op === 'get') return 'SELECT';
  if (op === 'set') return 'INSERT';
  if (op === 'delete' || op === 'clear') return 'DELETE';
  return 'UNKNOWN';
}

export async function trackGovaDbOp<T>(
  storeName: GovaDbStoreName,
  key: string,
  op: GovaDbOp,
  action: () => Promise<T>
): Promise<T> {
  if (!shouldTrack()) {
    return action();
  }

  const ctx = getActiveQueryContext();
  const id = `idb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const startedAt = performance.now();
  const ts = new Date().toISOString();

  const base: OperationRecord = {
    id,
    correlationId: id,
    parentId: ctx?.parentId,
    requestFlowId: ctx?.requestFlowId ?? getCurrentFlowId(),
    sessionId: getSessionId(),
    feature: ctx?.feature ?? 'unknown',
    page: ctx?.page ?? window.location.pathname,
    component: ctx?.component ?? 'unknown',
    hook: ctx?.hook ?? 'unknown',
    service: ctx?.service ?? 'GovaDB',
    queryOrCommand: `${op.toUpperCase()} ${storeName}/${key}`,
    repository: ctx?.repository ?? 'unknown',
    dbDriver: 'SQLite-Dev',
    table: storeName,
    entity: ctx?.entity ?? storeName,
    operationType: inferOpType(op),
    monitorLayer: 'cache',
    status: 'success',
    timestamp: ts,
    startedAt,
    completedAt: startedAt,
    executionTime: 0,
    rowsRead: op === 'get' ? 1 : 0,
    rowsWritten: op === 'set' ? 1 : 0,
    cacheSource: 'IndexedDB',
    cacheHit: op === 'get',
    refetchCount: 0,
    invalidationCount: 0,
    mutationCount: 0,
    pinned: false,
  };

  try {
    const result = await action();
    const completedAt = performance.now();
    useMonitorStore.getState().emit({
      ...base,
      status: 'success',
      completedAt,
      executionTime: Math.round((completedAt - startedAt) * 100) / 100,
    });
    return result;
  } catch (error) {
    const completedAt = performance.now();
    const err = error as Error;
    useMonitorStore.getState().emit({
      ...base,
      status: 'error',
      completedAt,
      executionTime: Math.round((completedAt - startedAt) * 100) / 100,
      errorMessage: err.message,
      executionStack: err.stack,
    });
    throw error;
  }
}
