/**
 * Repository-wide application import-cycle contract.
 *
 * Static imports, dynamic imports, and re-exports all count. Every discovered
 * feature/shared/core cluster participates. The baseline records pre-existing
 * strongly connected components found by the audit; any new or changed cyclic
 * component is rejected instead of being hidden by a hand-picked scan scope.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

import { ROOT, addViolation, extractImports, rel } from './architecture-types';
import { KNOWN_APPLICATION_CYCLIC_EDGE_BASELINE } from './application-cycle-edge-baseline';

const SRC = join(ROOT, 'src');

export const KNOWN_APPLICATION_CYCLE_BASELINE = [
  [
    'core:api',
    'core:config',
    'feature:app-reset',
    'feature:auth',
    'feature:notifications',
    'feature:onboarding',
    'feature:page-save',
    'feature:storage',
    'feature:system-logs',
    'shared:brand',
    'shared:i18n',
    'shared:preferences',
    'shared:theme',
  ],
  [
    'feature:advertisements',
    'feature:cart',
    'feature:categories',
    'feature:pharmacy-profile-catalog',
    'feature:product',
    'feature:product-search',
    'feature:profile',
    'feature:profile-products',
    'feature:seller-discounts',
    'feature:sharing',
    'feature:specialty-chat',
    'shared:layouts',
  ],
  ['feature:google-play-console', 'feature:release-commands'],
] as const;

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
  let nextIndex = 0;
  const indexes = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  const visit = (name: string): void => {
    indexes.set(name, nextIndex);
    lowLinks.set(name, nextIndex);
    nextIndex += 1;
    stack.push(name);
    onStack.add(name);

    for (const target of graph.get(name)?.keys() ?? []) {
      if (!graph.has(target)) continue;
      if (!indexes.has(target)) {
        visit(target);
        lowLinks.set(name, Math.min(lowLinks.get(name)!, lowLinks.get(target)!));
      } else if (onStack.has(target)) {
        lowLinks.set(name, Math.min(lowLinks.get(name)!, indexes.get(target)!));
      }
    }

    if (lowLinks.get(name) !== indexes.get(name)) return;
    const component: string[] = [];
    let member: string;
    do {
      member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
    } while (member !== name);

    const selfCycle = component.length === 1 && graph.get(name)?.has(name);
    if (component.length > 1 || selfCycle) components.push(component.sort());
  };

  for (const name of [...graph.keys()].sort()) {
    if (!indexes.has(name)) visit(name);
  }
  return components.sort((left, right) => left.join('|').localeCompare(right.join('|')));
}

function componentSignature(component: readonly string[]): string {
  return [...component].sort().join('|');
}

export function cyclicApplicationEdgeSignatures(
  graph = buildApplicationClusterGraph(),
): string[] {
  const edges: string[] = [];
  for (const component of findApplicationClusterCycles(graph)) {
    const members = new Set(component);
    for (const from of component) {
      for (const target of graph.get(from)?.keys() ?? []) {
        if (members.has(target)) edges.push(`${from} -> ${target}`);
      }
    }
  }
  return edges.sort();
}

export function applicationCycleBaselineViolations(
  graph = buildApplicationClusterGraph(),
): {
  unexpected: string[][];
  stale: readonly (readonly string[])[];
  unexpectedCyclicEdges: string[];
  staleCyclicEdges: readonly string[];
} {
  const actual = findApplicationClusterCycles(graph);
  const actualSignatures = new Set(actual.map(componentSignature));
  const baselineSignatures = new Set(KNOWN_APPLICATION_CYCLE_BASELINE.map(componentSignature));
  const actualEdges = cyclicApplicationEdgeSignatures(graph);
  const actualEdgeSet = new Set(actualEdges);
  const baselineEdgeSet = new Set<string>(KNOWN_APPLICATION_CYCLIC_EDGE_BASELINE);
  return {
    unexpected: actual.filter((component) => !baselineSignatures.has(componentSignature(component))),
    stale: KNOWN_APPLICATION_CYCLE_BASELINE.filter(
      (component) => !actualSignatures.has(componentSignature(component)),
    ),
    unexpectedCyclicEdges: actualEdges.filter((edge) => !baselineEdgeSet.has(edge)),
    staleCyclicEdges: KNOWN_APPLICATION_CYCLIC_EDGE_BASELINE.filter(
      (edge) => !actualEdgeSet.has(edge),
    ),
  };
}

function exampleFileForComponent(
  component: readonly string[],
  graph: Map<string, Map<string, string>>,
): string {
  const members = new Set(component);
  for (const from of component) {
    for (const [target, file] of graph.get(from) ?? []) {
      if (members.has(target)) return file;
    }
  }
  return 'src';
}

export function checkApplicationCycleContract(): void {
  const graph = buildApplicationClusterGraph();
  const { unexpected, stale, unexpectedCyclicEdges, staleCyclicEdges } =
    applicationCycleBaselineViolations(graph);
  for (const component of unexpected) {
    const exampleFile = exampleFileForComponent(component, graph);
    addViolation(
      'Application Cycles',
      join(ROOT, exampleFile),
      `New or changed circular application component: ${component.join(' <-> ')}.`,
      'Invert an edge, move a type to the owner, stop a barrel re-export, or register a port. Do not expand the audited baseline.',
    );
  }
  for (const component of stale) {
    addViolation(
      'Application Cycles',
      SRC,
      `The audited cycle baseline is stale because this component no longer exists: ${component.join(' <-> ')}.`,
      'Remove the resolved component from KNOWN_APPLICATION_CYCLE_BASELINE after verifying the dependency graph.',
    );
  }
  if (
    unexpected.length === 0 &&
    stale.length === 0 &&
    (unexpectedCyclicEdges.length > 0 || staleCyclicEdges.length > 0)
  ) {
    addViolation(
      'Application Cycles',
      SRC,
      `The application edges participating in known cycles changed. Added: ${unexpectedCyclicEdges.join(', ') || 'none'}. Removed: ${staleCyclicEdges.join(', ') || 'none'}.`,
      'Remove the new cyclic edge, or remove the resolved edge and update the audited component and edge baselines after graph review.',
    );
  }
}
