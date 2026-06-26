// ─────────────────────────────────────────────────────────────────────────────
// GoVa Operation Monitor — Zustand Store
// Central in-memory store for all monitored operation records.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import type {
  OperationRecord,
  MonitorStats,
  MonitorFilter,
  CallGraphNode,
  CallGraphEdge,
  DependencyNode,
  DependencyEdge,
} from './types';
import {
  SLOW_QUERY_THRESHOLD_MS,
  DUPLICATE_WINDOW_MS,
  N1_THRESHOLD,
} from './types';

// ─── Store State ──────────────────────────────────────────────────────────────
interface MonitorState {
  operations: OperationRecord[];
  isLive: boolean;
  filter: MonitorFilter;
  selectedOperationId: string | null;
  activeTab: string;
  theme: 'dark' | 'light';
  autoScroll: boolean;

  // Actions
  emit: (record: OperationRecord) => void;
  toggleLive: () => void;
  clear: () => void;
  setFilter: (partial: Partial<MonitorFilter>) => void;
  resetFilter: () => void;
  selectOperation: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  toggleTheme: () => void;
  togglePin: (id: string) => void;
  setAutoScroll: (v: boolean) => void;
  exportJSON: () => void;
  exportHTML: () => void;
  exportPDF: () => void;

  // Derived
  getFilteredOps: () => OperationRecord[];
  getStats: () => MonitorStats;
  getCallGraph: () => { nodes: CallGraphNode[]; edges: CallGraphEdge[] };
  getDependencyGraph: () => { nodes: DependencyNode[]; edges: DependencyEdge[] };
  getTreeData: () => TreeNode[];
}

// ─── Tree Structures ──────────────────────────────────────────────────────────
export interface TreeNode {
  key: string;
  label: string;
  layer: string;
  count: number;
  children: TreeNode[];
  records: OperationRecord[];
}

// ─── Default Filter ───────────────────────────────────────────────────────────
const DEFAULT_FILTER: MonitorFilter = {
  search: '',
  feature: '',
  page: '',
  component: '',
  hook: '',
  service: '',
  repository: '',
  table: '',
  entity: '',
  queryKey: '',
  operationType: '',
  status: '',
  dbDriver: '',
  cacheSource: '',
  dateFrom: '',
  dateTo: '',
  showPinnedOnly: false,
};

// ─── Initialise stored theme ──────────────────────────────────────────────────
function getStoredTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('gova-monitor-theme') as 'dark' | 'light') ?? 'dark';
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────
function detectDuplicate(ops: OperationRecord[], incoming: OperationRecord): boolean {
  if (!incoming.sql) return false;
  const key = `${incoming.sql}|${JSON.stringify(incoming.params)}`;
  const now = incoming.startedAt;
  return ops.slice(-100).some((op) => {
    if (op.id === incoming.id) return false;
    const opKey = `${op.sql}|${JSON.stringify(op.params)}`;
    return opKey === key && now - op.startedAt < DUPLICATE_WINDOW_MS;
  });
}

// ─── N+1 Detection ────────────────────────────────────────────────────────────
function detectN1(ops: OperationRecord[], incoming: OperationRecord): boolean {
  if (incoming.operationType !== 'SELECT') return false;
  const flowOps = ops.filter(
    (o) =>
      o.requestFlowId === incoming.requestFlowId &&
      o.table === incoming.table &&
      o.operationType === 'SELECT'
  );
  return flowOps.length >= N1_THRESHOLD;
}

// ─── Filter Predicate ─────────────────────────────────────────────────────────
function matchesFilter(op: OperationRecord, f: MonitorFilter): boolean {
  const search = f.search.toLowerCase();
  if (f.showPinnedOnly && !op.pinned) return false;
  if (f.feature && op.feature !== f.feature) return false;
  if (f.page && op.page !== f.page) return false;
  if (f.component && op.component !== f.component) return false;
  if (f.hook && op.hook !== f.hook) return false;
  if (f.service && op.service !== f.service) return false;
  if (f.repository && op.repository !== f.repository) return false;
  if (f.table && op.table !== f.table) return false;
  if (f.entity && op.entity !== f.entity) return false;
  if (f.queryKey && op.queryKey !== f.queryKey) return false;
  if (f.operationType && op.operationType !== f.operationType) return false;
  if (f.status && op.status !== f.status) return false;
  if (f.dbDriver && op.dbDriver !== f.dbDriver) return false;
  if (f.cacheSource && op.cacheSource !== f.cacheSource) return false;
  if (f.dateFrom && op.timestamp < f.dateFrom) return false;
  if (f.dateTo && op.timestamp > f.dateTo) return false;
  if (search) {
    const haystack = [
      op.feature, op.page, op.component, op.hook, op.service,
      op.queryOrCommand, op.repository, op.table, op.entity,
      op.queryKey, op.sql, op.operationType, op.status,
      op.errorMessage, op.correlationId, op.requestFlowId,
    ].join(' ').toLowerCase();
    if (!haystack.includes(search)) return false;
  }
  return true;
}

// ─── Statistics Builder ───────────────────────────────────────────────────────
function buildStats(ops: OperationRecord[]): MonitorStats {
  const dbOps = ops.filter((o) => o.table);
  const reads = dbOps.filter((o) => o.operationType === 'SELECT');
  const writes = dbOps.filter((o) => o.operationType !== 'SELECT' && o.operationType !== 'UNKNOWN');
  const cacheHits = ops.filter((o) => o.cacheHit);
  const cacheMisses = ops.filter((o) => !o.cacheHit && o.cacheSource !== 'Memory');
  const totalCache = cacheHits.length + cacheMisses.length;

  const avgTime =
    dbOps.length > 0
      ? dbOps.reduce((sum, o) => sum + o.executionTime, 0) / dbOps.length
      : 0;

  const topN = <T>(
    arr: T[],
    key: (item: T) => string,
    n = 10
  ): { name: string; count: number }[] => {
    const map = new Map<string, number>();
    arr.forEach((item) => {
      const k = key(item) || '(unknown)';
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, count }));
  };

  const sqlCounts = new Map<string, number>();
  dbOps.forEach((o) => {
    if (o.sql) sqlCounts.set(o.sql, (sqlCounts.get(o.sql) ?? 0) + 1);
  });

  return {
    totalReads: reads.length,
    totalWrites: writes.length,
    totalDbCalls: dbOps.length,
    totalCacheHits: cacheHits.length,
    totalCacheMisses: cacheMisses.length,
    cacheHitRate: totalCache > 0 ? Math.round((cacheHits.length / totalCache) * 100) : 0,
    cacheMissRate: totalCache > 0 ? Math.round((cacheMisses.length / totalCache) * 100) : 0,
    avgExecutionTime: Math.round(avgTime * 10) / 10,
    slowestOps: [...dbOps].sort((a, b) => b.executionTime - a.executionTime).slice(0, 10),
    mostExecutedQueries: [...sqlCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sql, count]) => ({ sql, count })),
    mostActiveFeatures: topN(ops, (o) => o.feature),
    mostActivePages: topN(ops, (o) => o.page),
    mostActiveTables: topN(dbOps, (o) => o.table),
    mostActiveRepositories: topN(ops, (o) => o.repository),
    mostActiveServices: topN(ops, (o) => o.service),
    activeQueries: ops.filter((o) => o.status === 'pending' && o.operationType === 'SELECT').length,
    activeMutations: ops.filter((o) => o.status === 'pending' && o.operationType !== 'SELECT').length,
    offlineReads: reads.filter((o) => o.cacheSource === 'IndexedDB').length,
    onlineReads: reads.filter((o) => o.cacheSource === 'Database').length,
    slowQueryCount: dbOps.filter((o) => o.executionTime > SLOW_QUERY_THRESHOLD_MS).length,
    n1Alerts: ops.filter((o) => o.isN1).length,
    duplicateAlerts: ops.filter((o) => o.isDuplicate).length,
  };
}

// ─── Tree Builder (Feature → Page → Component → Hook → ...) ──────────────────
function buildTree(ops: OperationRecord[]): TreeNode[] {
  const roots: TreeNode[] = [];

  // Group by requestFlowId first
  const byFlow = new Map<string, OperationRecord[]>();
  ops.forEach((op) => {
    const list = byFlow.get(op.requestFlowId) ?? [];
    list.push(op);
    byFlow.set(op.requestFlowId, list);
  });

  byFlow.forEach((flowOps, flowId) => {
    const firstOp = flowOps[0];
    const flowNode: TreeNode = {
      key: `flow-${flowId}`,
      label: `Flow: ${flowId.slice(0, 8)}… (${firstOp?.feature ?? '?'})`,
      layer: 'feature',
      count: flowOps.length,
      children: [],
      records: flowOps,
    };

    // Group by feature inside the flow
    const byFeature = new Map<string, OperationRecord[]>();
    flowOps.forEach((op) => {
      const list = byFeature.get(op.feature) ?? [];
      list.push(op);
      byFeature.set(op.feature, list);
    });

    byFeature.forEach((featureOps, feature) => {
      const featureNode: TreeNode = {
        key: `flow-${flowId}-feat-${feature}`,
        label: feature || '(unknown feature)',
        layer: 'feature',
        count: featureOps.length,
        children: [],
        records: featureOps,
      };

      // Group by page
      const byPage = new Map<string, OperationRecord[]>();
      featureOps.forEach((op) => {
        const list = byPage.get(op.page) ?? [];
        list.push(op);
        byPage.set(op.page, list);
      });

      byPage.forEach((pageOps, page) => {
        const pageNode: TreeNode = {
          key: `flow-${flowId}-feat-${feature}-page-${page}`,
          label: page || '(unknown page)',
          layer: 'ui',
          count: pageOps.length,
          children: [],
          records: pageOps,
        };

        // Leaf records (component → hook → service → query → repository → db)
        const leafNodes: TreeNode[] = pageOps.map((op) => ({
          key: `op-${op.id}`,
          label: op.operationType !== 'UNKNOWN'
            ? `${op.operationType} ${op.table}`
            : op.queryKey ?? op.id,
          layer: 'database',
          count: 1,
          children: [],
          records: [op],
        }));
        pageNode.children = leafNodes;
        featureNode.children.push(pageNode);
      });

      flowNode.children.push(featureNode);
    });

    roots.push(flowNode);
  });

  return roots;
}

// ─── Call Graph Builder ───────────────────────────────────────────────────────
function buildCallGraph(ops: OperationRecord[]): { nodes: CallGraphNode[]; edges: CallGraphEdge[] } {
  const nodes: CallGraphNode[] = [];
  const edges: CallGraphEdge[] = [];
  const seen = new Set<string>();

  ops.forEach((op) => {
    if (!seen.has(op.id)) {
      seen.add(op.id);
      nodes.push({
        id: op.id,
        label: op.operationType !== 'UNKNOWN'
          ? `${op.operationType} ${op.table}`
          : op.queryKey ?? op.id.slice(0, 8),
        layer: 'database',
        recordId: op.id,
      });
    }
    if (op.parentId) {
      edges.push({ from: op.parentId, to: op.id });
    }
  });

  return { nodes, edges };
}

// ─── Dependency Graph Builder ─────────────────────────────────────────────────
function buildDependencyGraph(ops: OperationRecord[]): { nodes: DependencyNode[]; edges: DependencyEdge[] } {
  const serviceMap = new Map<string, number>();
  const repoMap = new Map<string, number>();
  const queryMap = new Map<string, number>();
  const edgeMap = new Map<string, number>();

  ops.forEach((op) => {
    if (op.service) serviceMap.set(op.service, (serviceMap.get(op.service) ?? 0) + 1);
    if (op.repository) repoMap.set(op.repository, (repoMap.get(op.repository) ?? 0) + 1);
    if (op.queryOrCommand) queryMap.set(op.queryOrCommand, (queryMap.get(op.queryOrCommand) ?? 0) + 1);

    if (op.service && op.repository) {
      const k = `svc:${op.service}->repo:${op.repository}`;
      edgeMap.set(k, (edgeMap.get(k) ?? 0) + 1);
    }
    if (op.repository && op.queryOrCommand) {
      const k = `repo:${op.repository}->q:${op.queryOrCommand}`;
      edgeMap.set(k, (edgeMap.get(k) ?? 0) + 1);
    }
  });

  const nodes: DependencyNode[] = [
    ...[...serviceMap.entries()].map(([label, count]) => ({ id: `svc:${label}`, label, type: 'service' as const, count })),
    ...[...repoMap.entries()].map(([label, count]) => ({ id: `repo:${label}`, label, type: 'repository' as const, count })),
    ...[...queryMap.entries()].map(([label, count]) => ({ id: `q:${label}`, label, type: 'query' as const, count })),
  ];

  const edges: DependencyEdge[] = [...edgeMap.entries()].map(([k, count]) => {
    const [from, to] = k.split('->');
    return { from, to, count };
  });

  return { nodes, edges };
}

// ─── Session ID ───────────────────────────────────────────────────────────────
const SESSION_ID =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function getSessionId(): string {
  return SESSION_ID;
}

// ─── Active request flow ID (auto-reset per user action) ─────────────────────
let _currentFlowId: string = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

export function getCurrentFlowId(): string {
  return _currentFlowId;
}

export function startNewFlow(): string {
  _currentFlowId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return _currentFlowId;
}

// ─── Active query context (passed synchronously down the execution call stack) ─
let _activeQueryContext: any = null;

export function setActiveQueryContext(ctx: any): void {
  _activeQueryContext = ctx;
}

export function getActiveQueryContext(): any {
  return _activeQueryContext;
}

export function clearActiveQueryContext(): void {
  _activeQueryContext = null;
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useMonitorStore = create<MonitorState>((set, get) => ({
  operations: [],
  isLive: true,
  filter: DEFAULT_FILTER,
  selectedOperationId: null,
  activeTab: 'dashboard',
  theme: getStoredTheme(),
  autoScroll: true,

  emit: (record: OperationRecord) => {
    if (!get().isLive) return;
    set((state) => {
      const ops = state.operations;
      const isDuplicate = detectDuplicate(ops, record);
      const isN1 = detectN1(ops, record);
      const enriched: OperationRecord = { ...record, isDuplicate, isN1 };
      // Keep max 5000 records to avoid memory overflow
      const next = ops.length >= 5000 ? [...ops.slice(-4999), enriched] : [...ops, enriched];
      return { operations: next };
    });
  },

  toggleLive: () => set((s) => ({ isLive: !s.isLive })),

  clear: () =>
    set((s) => ({
      // Preserve pinned operations
      operations: s.operations.filter((o) => o.pinned),
    })),

  setFilter: (partial) =>
    set((s) => ({ filter: { ...s.filter, ...partial } })),

  resetFilter: () => set({ filter: DEFAULT_FILTER }),

  selectOperation: (id) => set({ selectedOperationId: id }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('gova-monitor-theme', next); } catch {}
      return { theme: next };
    }),

  togglePin: (id) =>
    set((s) => ({
      operations: s.operations.map((o) =>
        o.id === id ? { ...o, pinned: !o.pinned } : o
      ),
    })),

  setAutoScroll: (v) => set({ autoScroll: v }),

  exportJSON: () => {
    const ops = get().operations;
    const blob = new Blob([JSON.stringify(ops, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gova-monitor-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportHTML: () => {
    const ops = get().operations;
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>GoVa Monitor Export</title>
<style>
body{font-family:monospace;background:#0f172a;color:#e2e8f0;padding:16px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #334155;padding:6px 10px;text-align:left;font-size:12px}
th{background:#1e293b;color:#94a3b8}
tr:nth-child(even){background:#1e293b}
.success{color:#22c55e}.error{color:#ef4444}.pending{color:#94a3b8}
</style></head><body>
<h2>GoVa Operation Monitor Export — ${new Date().toISOString()}</h2>
<p>Total Operations: ${ops.length}</p>
<table>
<tr><th>Timestamp</th><th>Feature</th><th>Page</th><th>Table</th><th>Op</th><th>Status</th><th>Time (ms)</th><th>Cache</th><th>Driver</th></tr>
${ops.map((o) => `<tr>
<td>${o.timestamp}</td>
<td>${o.feature}</td>
<td>${o.page}</td>
<td>${o.table}</td>
<td>${o.operationType}</td>
<td class="${o.status}">${o.status}</td>
<td>${o.executionTime}</td>
<td>${o.cacheSource}</td>
<td>${o.dbDriver}</td>
</tr>`).join('')}
</table></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gova-monitor-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportPDF: () => {
    window.print();
  },

  getFilteredOps: () => {
    const { operations, filter } = get();
    return operations.filter((op) => matchesFilter(op, filter));
  },

  getStats: () => buildStats(get().getFilteredOps()),

  getCallGraph: () => buildCallGraph(get().getFilteredOps()),

  getDependencyGraph: () => buildDependencyGraph(get().getFilteredOps()),

  getTreeData: () => buildTree(get().getFilteredOps()),
}));
