/**
 * Application import-cycle contract for the five known cycle families.
 *
 * Static imports, dynamic imports, and re-exports all count. There is no
 * allowlist for new cycles inside this subgraph: invert an edge, move a type,
 * or stop a barrel re-export.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

import { ROOT, addViolation, extractImports, rel } from './architecture-types';

const SRC = join(ROOT, 'src');

export const APPLICATION_CYCLE_SUBGRAPH = new Set([
  'feature:advertisements',
  'feature:product',
  'feature:cart',
  'feature:profile',
  'feature:auth',
  'feature:page-save',
  'feature:page-snapshot',
  'feature:profile-products',
  'feature:pharmacy-profile-catalog',
  'shared:i18n',
  'shared:preferences',
  'shared:ui',
  'core:composition',
]);

function walkSource(directory: string, found: string[] = []): string[] {
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'tests' || entry === '__tests__') continue;
      walkSource(full, found);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) continue;
    if (entry.includes('__architecture_attack') || entry.includes('__attack_')) continue;
    found.push(full);
  }
  return found;
}

export function applicationClusterOf(repoPath: string): string | null {
  const normalized = repoPath.replace(/\\/g, '/');
  const feature = normalized.match(/^src\/features\/([^/]+)/);
  if (feature) return `feature:${feature[1]}`;
  const shared = normalized.match(/^src\/shared\/([^/]+)/);
  if (shared) return `shared:${shared[1]}`;
  const core = normalized.match(/^src\/core\/([^/]+)/);
  if (core) return `core:${core[1]}`;
  return null;
}

function resolveSpecifierCluster(specifier: string, importerFile: string): string | null {
  const feature = specifier.match(/^@\/features\/([^/]+)/);
  if (feature) return `feature:${feature[1]}`;
  const shared = specifier.match(/^@\/shared\/([^/]+)/);
  if (shared) return `shared:${shared[1]}`;
  const core = specifier.match(/^@\/core\/([^/]+)/);
  if (core) return `core:${core[1]}`;
  if (!specifier.startsWith('.')) return null;
  const resolved = relative(ROOT, resolve(dirname(importerFile), specifier)).replace(/\\/g, '/');
  return applicationClusterOf(resolved);
}

export function buildApplicationClusterGraph(): Map<string, Map<string, string>> {
  const graph = new Map<string, Map<string, string>>();
  for (const file of walkSource(SRC)) {
    const from = applicationClusterOf(rel(file));
    if (!from) continue;
    const edges = graph.get(from) ?? new Map<string, string>();
    for (const specifier of extractImports(readFileSync(file, 'utf8'))) {
      const target = resolveSpecifierCluster(specifier, file);
      if (!target || target === from) continue;
      if (!edges.has(target)) edges.set(target, rel(file));
    }
    graph.set(from, edges);
  }
  return graph;
}

export function findApplicationClusterCycles(
  graph = buildApplicationClusterGraph(),
): string[][] {
  const cycles: string[][] = [];
  const reported = new Set<string>();
  const state = new Map<string, 'visiting' | 'done'>();

  const walk = (name: string, stack: string[]): void => {
    state.set(name, 'visiting');
    stack.push(name);
    for (const target of graph.get(name)?.keys() ?? []) {
      if (!APPLICATION_CYCLE_SUBGRAPH.has(target)) continue;
      if (state.get(target) === 'visiting') {
        const cycle = [...stack.slice(stack.indexOf(target)), target];
        const signature = cycle.slice(0, -1).sort().join('|');
        if (!reported.has(signature)) {
          reported.add(signature);
          cycles.push(cycle);
        }
        continue;
      }
      if (state.get(target) !== 'done' && graph.has(target)) walk(target, stack);
    }
    stack.pop();
    state.set(name, 'done');
  };

  for (const name of [...graph.keys()].sort()) {
    if (!APPLICATION_CYCLE_SUBGRAPH.has(name)) continue;
    if (!state.has(name)) walk(name, []);
  }
  return cycles.sort((left, right) => left.join('>').localeCompare(right.join('>')));
}

export function checkApplicationCycleContract(): void {
  const graph = buildApplicationClusterGraph();
  for (const cycle of findApplicationClusterCycles(graph)) {
    const start = cycle[0]!;
    const exampleFile = graph.get(start)?.get(cycle[1]!) ?? 'src';
    addViolation(
      'Application Cycles',
      join(ROOT, exampleFile),
      `Circular application dependency: ${cycle.join(' -> ')}.`,
      'Invert one edge: move a type to the owning package, stop a barrel re-export, or register a port. Do not add an allowlist.',
    );
  }
}
