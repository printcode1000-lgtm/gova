import { create } from 'zustand';
import { asolDbGet, asolDbSet, ASOL_DB_STORES } from '@/modules/data-access/browser/asol-db';
import type {
  OperationRecord,
  MonitorStats,
  MonitorFilter,
  CallGraphNode,
  CallGraphEdge,
  DependencyNode,
  DependencyEdge,
} from "./types";
import {
  SLOW_QUERY_THRESHOLD_MS,
  DUPLICATE_WINDOW_MS,
  N1_THRESHOLD,
  resolveMonitorLayer,
} from "./types";

import { MonitorState, DEFAULT_FILTER, detectDuplicate, detectN1, matchesFilter, buildStats, buildTree, buildCallGraph } from "./monitor-store-parts/monitor-store.monitor-types";
import { buildDependencyGraph } from "./monitor-store-parts/monitor-store.performance-analysis";

export type { TreeNode } from "./monitor-store-parts/monitor-store.monitor-types";

const SESSION_ID =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function getSessionId(): string {
  return SESSION_ID;
}

let _currentFlowId: string = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

export function getCurrentFlowId(): string {
  return _currentFlowId;
}

export function startNewFlow(): string {
  _currentFlowId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return _currentFlowId;
}

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

export const useMonitorStore = create<MonitorState>((set, get) => ({
  operations: [],
  isLive: true,
  filter: DEFAULT_FILTER,
  selectedOperationId: null,
  activeTab: 'dashboard',
  theme: 'dark',
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
      void asolDbSet(ASOL_DB_STORES.APP_SETTINGS, 'monitor-theme', next);
      return { theme: next };
    }),

  loadTheme: async () => {
    try {
      const stored = await asolDbGet<'dark' | 'light'>(ASOL_DB_STORES.APP_SETTINGS, 'monitor-theme');
      if (stored) {
        set({ theme: stored });
      }
    } catch (error) {
      console.warn("[OperationMonitor] Failed to load saved theme.", error);
    }
  },

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
    a.download = `asol-monitor-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportHTML: () => {
    const ops = get().operations;
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>تصدير مراقب ASOL</title>
<style>
body{font-family:monospace;background:#0f172a;color:#e2e8f0;padding:16px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #334155;padding:6px 10px;text-align:right;font-size:12px}
th{background:#1e293b;color:#94a3b8}
tr:nth-child(even){background:#1e293b}
.success{color:#22c55e}.error{color:#ef4444}.pending{color:#94a3b8}
</style></head><body>
<h2>تصدير مراقب عمليات ASOL — ${new Date().toISOString()}</h2>
<p>إجمالي العمليات: ${ops.length}</p>
<table>
<tr><th>الوقت</th><th>الميزة</th><th>الصفحة</th><th>الجدول</th><th>العملية</th><th>الحالة</th><th>المدة (ms)</th><th>الذاكرة المؤقتة</th><th>المحرك</th></tr>
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
    a.download = `asol-monitor-${Date.now()}.html`;
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
