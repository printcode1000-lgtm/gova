// ─────────────────────────────────────────────────────────────────────────────
// ASOL Operation Monitor — Types
// All event shapes, constants, and colour tokens used across the monitor.
// ─────────────────────────────────────────────────────────────────────────────

export type OperationType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UNKNOWN';
export type OperationStatus = 'pending' | 'success' | 'error';
export type DbDriver = 'SQLite-Dev' | 'Turso-Production';
export type CacheSource = 'Memory' | 'IndexedDB' | 'Database' | 'HTTP';
export type RefetchReason = 'stale' | 'windowFocus' | 'manual' | 'invalidation' | 'mount' | 'unknown';
export type LayerName = 'ui' | 'hook' | 'service' | 'asol-api' | 'query' | 'repository' | 'database' | 'cache';

// ─── Colour tokens ────────────────────────────────────────────────────────────
export const LAYER_COLORS: Record<LayerName, string> = {
  ui:         '#3b82f6',
  hook:       '#06b6d4',
  service:    '#22c55e',
  'asol-api': '#8b5cf6',
  query:      '#f97316',
  repository: '#a855f7',
  database:   '#ef4444',
  cache:      '#eab308',
};

export const STATUS_COLORS: Record<OperationStatus, string> = {
  pending: '#94a3b8',
  success: '#22c55e',
  error:   '#ef4444',
};

export const OP_TYPE_COLORS: Record<OperationType, string> = {
  SELECT:  '#3b82f6',
  INSERT:  '#22c55e',
  UPDATE:  '#f97316',
  DELETE:  '#ef4444',
  UNKNOWN: '#94a3b8',
};

// ─── Per-layer timing span ────────────────────────────────────────────────────
export interface LayerSpan {
  layer: LayerName;
  startedAt: number;    // performance.now()
  completedAt: number;
  durationMs: number;
}

// ─── Core operation record ────────────────────────────────────────────────────
export interface OperationRecord {
  // Identity
  id: string;
  correlationId: string;        // groups related DB + cache records
  requestFlowId: string;        // unique per user-initiated action
  parentId?: string;            // for nested operations
  sessionId: string;

  // Architecture layers
  feature: string;
  page: string;
  component: string;
  hook: string;
  service: string;
  queryOrCommand: string;
  repository: string;

  // Database
  dbDriver: DbDriver;
  table: string;
  entity: string;
  operationType: OperationType;
  sql?: string;
  params?: unknown[];
  status: OperationStatus;
  errorMessage?: string;
  executionStack?: string;       // stack trace on error

  // Timing
  timestamp: string;             // ISO string for display
  startedAt: number;             // performance.now()
  completedAt: number;
  executionTime: number;         // ms

  // Result
  rowsRead: number;
  rowsWritten: number;

  // Memory
  memoryBefore?: number;         // bytes
  memoryAfter?: number;
  memoryDelta?: number;          // bytes

  // TanStack Query
  queryKey?: string;
  cacheSource: CacheSource;
  cacheHit: boolean;
  refetchCount: number;
  refetchReason?: RefetchReason;
  invalidationCount: number;
  mutationCount: number;
  lastFetch?: string;
  nextStaleTime?: string;
  cacheSize?: number;

  // Previous result (for Query Diff)
  previousResult?: unknown;
  currentResult?: unknown;

  // Detection flags
  isDuplicate?: boolean;
  isN1?: boolean;

  // Flame chart layer spans
  layerSpans?: LayerSpan[];

  // Pinned by developer
  pinned: boolean;

  // HTTP (AsolApiClient — client-side only)
  httpMethod?: string;
  httpRoute?: string;
  monitorLayer?: LayerName;
}

// ─── Aggregate statistics ─────────────────────────────────────────────────────
export interface MonitorStats {
  totalReads: number;
  totalWrites: number;
  totalDbCalls: number;
  totalCacheHits: number;
  totalCacheMisses: number;
  cacheHitRate: number;          // 0–100 %
  cacheMissRate: number;
  avgExecutionTime: number;      // ms
  slowestOps: OperationRecord[];
  mostExecutedQueries: { sql: string; count: number }[];
  mostActiveFeatures: { name: string; count: number }[];
  mostActivePages: { name: string; count: number }[];
  mostActiveTables: { name: string; count: number }[];
  mostActiveRepositories: { name: string; count: number }[];
  mostActiveServices: { name: string; count: number }[];
  activeQueries: number;
  activeMutations: number;
  offlineReads: number;
  onlineReads: number;
  slowQueryCount: number;
  n1Alerts: number;
  duplicateAlerts: number;
}

// ─── Filter shape ─────────────────────────────────────────────────────────────
export interface MonitorFilter {
  search: string;
  feature: string;
  page: string;
  component: string;
  hook: string;
  service: string;
  repository: string;
  table: string;
  entity: string;
  queryKey: string;
  operationType: string;
  status: string;
  dbDriver: string;
  cacheSource: string;
  dateFrom: string;
  dateTo: string;
  showPinnedOnly: boolean;
}

// ─── Call graph node/edge ─────────────────────────────────────────────────────
export interface CallGraphNode {
  id: string;
  label: string;
  layer: LayerName;
  recordId: string;
}

export interface CallGraphEdge {
  from: string;
  to: string;
}

// ─── Dependency graph ─────────────────────────────────────────────────────────
export interface DependencyNode {
  id: string;
  label: string;
  type: 'service' | 'repository' | 'query';
  count: number;
}

export interface DependencyEdge {
  from: string;
  to: string;
  count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function resolveMonitorLayer(op: OperationRecord): LayerName {
  if (op.monitorLayer) return op.monitorLayer;
  if (op.httpRoute || op.cacheSource === 'HTTP') return 'asol-api';
  if (op.table) return 'database';
  if (op.repository && op.repository !== 'unknown') return 'repository';
  if (op.queryOrCommand && op.queryOrCommand !== 'unknown' && !op.table) return 'query';
  if (op.service && op.service !== 'unknown') return 'service';
  if (op.hook && op.hook !== 'unknown') return 'hook';
  if (op.cacheSource === 'IndexedDB' || op.cacheSource === 'Memory') return 'cache';
  if (op.component && op.component !== 'unknown') return 'ui';
  return 'hook';
}

export function inferOperationType(sql: string): OperationType {
  const verb = sql.trim().split(/\s+/)[0]?.toUpperCase();
  if (verb === 'SELECT') return 'SELECT';
  if (verb === 'INSERT') return 'INSERT';
  if (verb === 'UPDATE') return 'UPDATE';
  if (verb === 'DELETE') return 'DELETE';
  return 'UNKNOWN';
}

export function readMemory(): number | undefined {
  try {
    return (performance as any).memory?.usedJSHeapSize;
  } catch {
    return undefined;
  }
}

export const SLOW_QUERY_THRESHOLD_MS = 500;
export const DUPLICATE_WINDOW_MS = 2000;
export const N1_THRESHOLD = 3;
