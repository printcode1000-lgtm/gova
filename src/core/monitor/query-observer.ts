// ─────────────────────────────────────────────────────────────────────────────
// GoVa Operation Monitor — TanStack Query Cache Observer
// Attaches to the QueryClient and translates every cache lifecycle event into
// an OperationRecord emitted to the monitor store.
// ─────────────────────────────────────────────────────────────────────────────

import type { QueryClient } from '@tanstack/react-query';
import { useMonitorStore, getSessionId, getCurrentFlowId, setActiveQueryContext, clearActiveQueryContext } from './monitor-store';
import type { CacheSource, RefetchReason } from './types';
import { isDevelopment } from '@/core/config';

// Derive cache source from query metadata / fetch counts
function deriveCacheSource(query: any, actionType: string): CacheSource {
  if (actionType === 'fetch') return 'HTTP';
  if (query.state?.fetchMeta?.revalidation) return 'HTTP';
  if (query.state.dataUpdateCount === 0) return 'IndexedDB';
  return 'Memory';
}

function toIsoTimestamp(ms: number | undefined): string | undefined {
  if (ms === undefined || !Number.isFinite(ms)) return undefined;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function computeNextStaleTimeIso(
  dataUpdatedAt: number | undefined,
  staleTime: number | undefined,
): string | undefined {
  if (!dataUpdatedAt || staleTime === undefined) return undefined;
  if (!Number.isFinite(staleTime)) return undefined;
  return toIsoTimestamp(dataUpdatedAt + staleTime);
}

// Derive refetch reason from the query cache action
function deriveRefetchReason(action: any, query: any): RefetchReason {
  if (action?.meta?.refetchPage !== undefined) return 'manual';
  const triggerReason = query.state?.fetchMeta?.fetchMore ? 'manual' : undefined;
  if (triggerReason) return triggerReason;

  const fetchMeta = query.state?.fetchMeta;
  if (!fetchMeta) return 'mount';
  if (fetchMeta.refetchType === 'active') return 'invalidation';
  if (fetchMeta.refetchType === 'inactive') return 'invalidation';
  if (query.isStaleByTime(0)) return 'stale';

  return 'unknown';
}

let mutationCount = 0;

export function attachQueryObserver(queryClient: QueryClient): () => void {
  if (!isDevelopment) return () => {};

  const emit = useMonitorStore.getState().emit;
  const sessionId = getSessionId();

  // ─── Query Cache Subscriber ───────────────────────────────────────────────
  const unsubQuery = queryClient.getQueryCache().subscribe((event: any) => {
    if (!event?.query) return;
    const query = event.query;

    // Wrap queryFn if not already wrapped
    if (query.options?.queryFn && !query.options.queryFn.__wrapped) {
      const originalQueryFn = query.options.queryFn;
      const wrapped = async (...args: any[]) => {
        setActiveQueryContext({
          feature: query.meta?.feature ?? 'unknown',
          page: query.meta?.page ?? (typeof window !== 'undefined' ? window.location.pathname : 'unknown'),
          component: query.meta?.component ?? 'unknown',
          hook: query.meta?.hook ?? 'unknown',
          service: query.meta?.service ?? 'unknown',
          queryOrCommand: query.meta?.queryOrCommand ?? JSON.stringify(query.queryKey),
          repository: query.meta?.repository ?? 'unknown',
          table: query.meta?.table ?? '',
          entity: query.meta?.entity ?? '',
          requestFlowId: getCurrentFlowId(),
        });
        const fnStarted = performance.now();
        try {
          const result = await originalQueryFn(...args);
          query.meta = { ...query.meta, lastExecutionTimeMs: performance.now() - fnStarted, previousResult: query.state.data, currentResult: result };
          return result;
        } finally {
          clearActiveQueryContext();
        }
      };
      wrapped.__wrapped = true;
      query.options.queryFn = wrapped;
    }

    const queryKey = JSON.stringify(query.queryKey);
    const state = query.state;
    const actionType = event.type as string;

    const now = performance.now();
    const ts = new Date().toISOString();
    const flowId = getCurrentFlowId();

    // Ignore internal persister cache key
    if (queryKey.includes('rq_cache')) return;

    const cacheSource = deriveCacheSource(query, actionType);
    const cacheHit = cacheSource === 'IndexedDB' || cacheSource === 'Memory';
    const refetchReason = deriveRefetchReason(event, query);

    if (actionType === 'updated' || actionType === 'added') {
      const rec = {
        id: `rq-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        correlationId: queryKey,
        requestFlowId: flowId,
        sessionId,
        feature: query.meta?.feature ?? 'unknown',
        page: query.meta?.page ?? (typeof window !== 'undefined' ? window.location.pathname : 'unknown'),
        component: query.meta?.component ?? 'unknown',
        hook: query.meta?.hook ?? 'unknown',
        service: query.meta?.service ?? 'unknown',
        queryOrCommand: queryKey,
        repository: query.meta?.repository ?? 'unknown',
        dbDriver: (isDevelopment ? 'SQLite-Dev' : 'Turso-Production') as any,
        table: query.meta?.table ?? '',
        entity: query.meta?.entity ?? '',
        operationType: 'SELECT' as const,
        sql: undefined,
        params: undefined,
        status: state.status === 'error'
          ? 'error'
          : state.status === 'success'
          ? 'success'
          : 'pending' as any,
        errorMessage: state.error ? String(state.error) : undefined,
        timestamp: ts,
        startedAt: now,
        completedAt: now + (query.meta?.lastExecutionTimeMs ?? 0),
        executionTime: Math.round((query.meta?.lastExecutionTimeMs ?? 0) * 100) / 100,
        rowsRead: Array.isArray(state.data) ? state.data.length : state.data ? 1 : 0,
        rowsWritten: 0,
        queryKey,
        cacheSource,
        cacheHit,
        refetchCount: query.state.dataUpdateCount ?? 0,
        refetchReason,
        invalidationCount: 0,
        mutationCount,
        previousResult: query.meta?.previousResult,
        currentResult: query.meta?.currentResult,
        lastFetch: toIsoTimestamp(state.dataUpdatedAt),
        nextStaleTime:
          query.getObserversCount() > 0
            ? computeNextStaleTimeIso(state.dataUpdatedAt, query.options?.staleTime)
            : undefined,
        monitorLayer: cacheSource === 'IndexedDB' || cacheSource === 'Memory' ? 'cache' : 'hook',
        pinned: false,
      };
      emit(rec as any);
    }
  });

  // ─── Mutation Cache Subscriber ────────────────────────────────────────────
  const unsubMutation = queryClient.getMutationCache().subscribe((event: any) => {
    if (!event?.mutation) return;
    mutationCount++;

    const mutation = event.mutation;

    // Wrap mutationFn if not already wrapped
    if (mutation.options?.mutationFn && !mutation.options.mutationFn.__wrapped) {
      const originalMutationFn = mutation.options.mutationFn;
      const wrapped = async (...args: any[]) => {
        const mutationCtxId = `mut-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setActiveQueryContext({
          feature: mutation.options?.meta?.feature ?? 'unknown',
          page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
          component: mutation.options?.meta?.component ?? 'unknown',
          hook: mutation.options?.meta?.hook ?? 'unknown',
          service: mutation.options?.meta?.service ?? 'unknown',
          queryOrCommand: mutation.options?.meta?.queryOrCommand ?? 'Mutation',
          repository: mutation.options?.meta?.repository ?? 'unknown',
          table: mutation.options?.meta?.table ?? '',
          entity: mutation.options?.meta?.entity ?? '',
          monitorMutationId: mutationCtxId,
          requestFlowId: getCurrentFlowId(),
        });
        try {
          return await originalMutationFn(...args);
        } finally {
          clearActiveQueryContext();
        }
      };
      wrapped.__wrapped = true;
      mutation.options.mutationFn = wrapped;
    }

    const now = performance.now();
    const ts = new Date().toISOString();
    const flowId = getCurrentFlowId();

    const opType = (mutation.options?.meta?.operationType as any) ?? 'INSERT';

    const rec = {
      id: `mut-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      correlationId: `mutation-${mutationCount}`,
      requestFlowId: flowId,
      sessionId,
      feature: mutation.options?.meta?.feature ?? 'unknown',
      page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      component: mutation.options?.meta?.component ?? 'unknown',
      hook: mutation.options?.meta?.hook ?? 'unknown',
      service: mutation.options?.meta?.service ?? 'unknown',
      queryOrCommand: mutation.options?.meta?.queryOrCommand ?? 'Mutation',
      repository: mutation.options?.meta?.repository ?? 'unknown',
      dbDriver: (isDevelopment ? 'SQLite-Dev' : 'Turso-Production') as any,
      table: mutation.options?.meta?.table ?? '',
      entity: mutation.options?.meta?.entity ?? '',
      operationType: opType,
      status: mutation.state.status === 'error'
        ? 'error'
        : mutation.state.status === 'success'
        ? 'success'
        : 'pending' as any,
      errorMessage: mutation.state.error ? String(mutation.state.error) : undefined,
      timestamp: ts,
      startedAt: now,
      completedAt: now,
      executionTime: 0,
      rowsRead: 0,
      rowsWritten: mutation.state.status === 'success' ? 1 : 0,
      queryKey: undefined,
      cacheSource: 'HTTP' as const,
      cacheHit: false,
      refetchCount: 0,
      invalidationCount: 0,
      mutationCount,
      monitorLayer: 'hook' as const,
      pinned: false,
    };
    useMonitorStore.getState().emit(rec as any);
  });

  return () => {
    unsubQuery();
    unsubMutation();
  };
}
