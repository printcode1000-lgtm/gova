import { isDevelopment } from '@/core/config';
import { DEV_TRACE_HEADER } from './dev-trace-types';
import {
  getActiveQueryContext,
  getCurrentFlowId,
  getSessionId,
  useMonitorStore,
} from './monitor-store';
import { emitServerTraceFromHeader } from './emit-server-trace';
import type { OperationRecord, OperationType } from './types';

function inferHttpOperationType(method: string, route: string): OperationType {
  const upper = method.toUpperCase();
  if (route.includes('/register')) return 'INSERT';
  if (route.includes('/login')) return 'UPDATE';
  if (route.includes('/logout')) return 'DELETE';
  if (upper === 'GET') return 'SELECT';
  if (upper === 'DELETE') return 'DELETE';
  if (upper === 'POST') return 'INSERT';
  if (upper === 'PUT' || upper === 'PATCH') return 'UPDATE';
  return 'UNKNOWN';
}

function shouldTrack(): boolean {
  return typeof window !== 'undefined' && isDevelopment;
}

export type TrackedApiResult<T> = T | { data: T; response: Response };

export async function trackGovaApiRequest<T>(
  method: string,
  route: string,
  isBusinessApi: boolean,
  request: () => Promise<TrackedApiResult<T>>
): Promise<T> {
  if (!shouldTrack()) {
    const raw = await request();
    return unwrapTrackedResult(raw);
  }

  const ctx = getActiveQueryContext();
  const id = `http-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const startedAt = performance.now();
  const ts = new Date().toISOString();
  const operationType = inferHttpOperationType(method, route);

  const base: Omit<OperationRecord, 'status' | 'completedAt' | 'executionTime'> = {
    id,
    correlationId: id,
    parentId: ctx?.monitorMutationId ?? ctx?.parentId,
    requestFlowId: ctx?.requestFlowId ?? getCurrentFlowId(),
    sessionId: getSessionId(),
    feature: ctx?.feature ?? 'unknown',
    page: ctx?.page ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
    component: ctx?.component ?? 'unknown',
    hook: ctx?.hook ?? 'unknown',
    service: ctx?.service ?? 'GovaApiClient',
    queryOrCommand: ctx?.queryOrCommand ?? `${method} ${route}`,
    repository: ctx?.repository ?? 'unknown',
    dbDriver: isDevelopment ? 'SQLite-Dev' : 'Turso-Production',
    table: ctx?.table ?? '',
    entity: ctx?.entity ?? '',
    operationType,
    httpMethod: method,
    httpRoute: route,
    monitorLayer: isBusinessApi ? 'gova-api' : 'cache',
    timestamp: ts,
    startedAt,
    rowsRead: 0,
    rowsWritten: 0,
    cacheSource: isBusinessApi ? 'HTTP' : 'Memory',
    cacheHit: false,
    refetchCount: 0,
    invalidationCount: 0,
    mutationCount: 0,
    pinned: false,
  };

  try {
    const raw = await request();
    const response = hasResponse(raw) ? raw.response : undefined;
    const data = unwrapTrackedResult(raw);
    const completedAt = performance.now();

    useMonitorStore.getState().emit({
      ...base,
      status: 'success',
      completedAt,
      executionTime: Math.round((completedAt - startedAt) * 100) / 100,
      rowsRead: method.toUpperCase() === 'GET' ? 1 : 0,
      rowsWritten: method.toUpperCase() !== 'GET' ? 1 : 0,
    });

    if (response && isBusinessApi) {
      emitServerTraceFromHeader(response.headers.get(DEV_TRACE_HEADER), id, startedAt);
    }

    return data;
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

function hasResponse<T>(value: TrackedApiResult<T>): value is { data: T; response: Response } {
  return typeof value === 'object' && value !== null && 'response' in value && 'data' in value;
}

function unwrapTrackedResult<T>(value: TrackedApiResult<T>): T {
  if (hasResponse(value)) return value.data;
  return value;
}
