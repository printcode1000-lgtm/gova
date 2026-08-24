/**
 * Feature dependency graph contract.
 *
 * Builds the real cross-feature import graph from production sources under
 * `src/features/`, then proves that every real edge is declared in
 * `permittedDependencies`, every declaration is used, and every target is a
 * registered feature. Door legality is enforced by `feature-door-contract`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

import { APPLICATION_FEATURES } from '../registry/application-features-registry';
import { ROOT, addViolation, extractImports, rel } from './architecture-types';

const FEATURES_ROOT = join(ROOT, 'src', 'features');

function featureSourceFiles(featureName: string): string[] {
  const root = join(FEATURES_ROOT, featureName);
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'tests' || entry === '__tests__' || entry === 'node_modules') continue;
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) continue;
      if (entry.includes('__architecture_attack') || entry.includes('__attack_')) continue;
      found.push(full);
    }
  };
  walk(root);
  return found;
}

function featureOfRepoPath(repoPath: string): string | null {
  const normalized = repoPath.replace(/\\/g, '/');
  const match = normalized.match(/^src\/features\/([^/]+)(?:\/|$)/);
  return match?.[1] ?? null;
}

function targetFeatureOfSpecifier(specifier: string, importerFile: string): string | null {
  const alias = specifier.match(/^@\/features\/([^/]+)(?:\/|$)/);
  if (alias) return alias[1]!;
  if (!specifier.startsWith('.')) return null;
  const resolved = relative(ROOT, resolve(dirname(importerFile), specifier)).replace(/\\/g, '/');
  return featureOfRepoPath(resolved);
}

function buildActualGraph(): Map<string, Map<string, string>> {
  const registered = new Set(APPLICATION_FEATURES.map((feature) => feature.name));
  const graph = new Map<string, Map<string, string>>();
  for (const feature of APPLICATION_FEATURES) {
    const edges = new Map<string, string>();
    for (const file of featureSourceFiles(feature.name)) {
      for (const specifier of extractImports(readFileSync(file, 'utf8'))) {
        const target = targetFeatureOfSpecifier(specifier, file);
        if (!target || target === feature.name || !registered.has(target)) continue;
        if (!edges.has(target)) edges.set(target, rel(file));
      }
    }
    graph.set(feature.name, edges);
  }
  return graph;
}

export function checkFeatureDependencyContract(): void {
  const actual = buildActualGraph();
  const byName = new Map(APPLICATION_FEATURES.map((feature) => [feature.name, feature]));
  for (const feature of APPLICATION_FEATURES) {
    const edges = actual.get(feature.name) ?? new Map<string, string>();
    const allowed = new Set(feature.permittedDependencies);

    for (const [target, exampleFile] of edges) {
      if (allowed.has(target)) continue;
      addViolation(
        'Feature Dependencies',
        join(ROOT, exampleFile),
        `Feature "${feature.name}" imports "${target}" but permittedDependencies does not declare it.`,
        `Add "${target}" only if the edge is justified, then import through the target feature Public API.`,
      );
    }

    for (const dependency of feature.permittedDependencies) {
      if (!byName.has(dependency)) {
        addViolation(
          'Feature Dependencies',
          join(ROOT, feature.sourcePath),
          `Feature "${feature.name}" lists unknown permitted dependency "${dependency}".`,
          'Remove the stale name or register the target feature.',
        );
        continue;
      }
      if (!edges.has(dependency)) {
        addViolation(
          'Feature Dependencies',
          join(ROOT, feature.sourcePath),
          `Feature "${feature.name}" declares permitted dependency "${dependency}" but no production import uses it.`,
          'Remove stale dependency authority.',
        );
      }
    }
  }
}
