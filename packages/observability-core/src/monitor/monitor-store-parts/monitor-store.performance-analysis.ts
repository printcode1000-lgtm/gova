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

export function buildDependencyGraph(ops: OperationRecord[]): { nodes: DependencyNode[]; edges: DependencyEdge[] } {
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
