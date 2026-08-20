import { create } from 'zustand';
import { asolDbGet, asolDbSet, ASOL_DB_STORES } from '@asol/data-core/browser';
import type {
  OperationRecord,
  MonitorStats,
  MonitorFilter,
  CallGraphNode,
  CallGraphEdge,
  DependencyNode,
  DependencyEdge,
} from "../types";
import {
  SLOW_QUERY_THRESHOLD_MS,
  DUPLICATE_WINDOW_MS,
  N1_THRESHOLD,
  resolveMonitorLayer,
} from "../types";

export interface MonitorState {
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
  loadTheme: () => Promise<void>;
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

export interface TreeNode {
  key: string;
  label: string;
  layer: string;
  count: number;
  children: TreeNode[];
  records: OperationRecord[];
}

export const DEFAULT_FILTER: MonitorFilter = {
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

export function detectDuplicate(ops: OperationRecord[], incoming: OperationRecord): boolean {
  if (!incoming.sql) return false;
  const key = `${incoming.sql}|${JSON.stringify(incoming.params)}`;
  const now = incoming.startedAt;
  return ops.slice(-100).some((op) => {
    if (op.id === incoming.id) return false;
    const opKey = `${op.sql}|${JSON.stringify(op.params)}`;
    return opKey === key && now - op.startedAt < DUPLICATE_WINDOW_MS;
  });
}

export function detectN1(ops: OperationRecord[], incoming: OperationRecord): boolean {
  if (incoming.operationType !== 'SELECT') return false;
  const flowOps = ops.filter(
    (o) =>
      o.requestFlowId === incoming.requestFlowId &&
      o.table === incoming.table &&
      o.operationType === 'SELECT'
  );
  return flowOps.length >= N1_THRESHOLD;
}

export function matchesFilter(op: OperationRecord, f: MonitorFilter): boolean {
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

export function buildStats(ops: OperationRecord[]): MonitorStats {
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
    onlineReads: reads.filter((o) => o.cacheSource === 'Database' || o.cacheSource === 'HTTP').length,
    slowQueryCount: dbOps.filter((o) => o.executionTime > SLOW_QUERY_THRESHOLD_MS).length,
    n1Alerts: ops.filter((o) => o.isN1).length,
    duplicateAlerts: ops.filter((o) => o.isDuplicate).length,
  };
}

export function buildTree(ops: OperationRecord[]): TreeNode[] {
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

export function buildCallGraph(ops: OperationRecord[]): { nodes: CallGraphNode[]; edges: CallGraphEdge[] } {
  const nodes: CallGraphNode[] = [];
  const edges: CallGraphEdge[] = [];
  const seen = new Set<string>();

  ops.forEach((op) => {
    if (!seen.has(op.id)) {
      seen.add(op.id);
      nodes.push({
        id: op.id,
        label: op.operationType !== 'UNKNOWN'
          ? `${op.operationType} ${op.table || op.httpRoute || ''}`.trim()
          : op.queryKey ?? op.httpRoute ?? op.id.slice(0, 8),
        layer: resolveMonitorLayer(op),
        recordId: op.id,
      });
    }
    if (op.parentId && seen.has(op.parentId)) {
      edges.push({ from: op.parentId, to: op.id });
    } else if (op.correlationId && op.correlationId !== op.id && seen.has(op.correlationId)) {
      edges.push({ from: op.correlationId, to: op.id });
    }
  });

  return { nodes, edges };
}
