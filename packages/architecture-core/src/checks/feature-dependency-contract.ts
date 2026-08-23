/**
 * Feature dependency graph contract.
 *
 * Builds the real cross-feature import graph from production sources under
 * `src/features/`, then proves:
 * - every edge is declared on `permittedDependencies` (or `deepImportSeams`)
 * - every declared `permittedDependencies` entry is used (no stale edges)
 * - every declared dependency / seam names a registered feature
 *
 * Feature dependency *cycles* are allowed in the declared graph (deepImportSeams
 * exist to break door cycles). Package cycles remain forbidden separately.
 *
 * Composition packages and `src/app` / `src/core` / `src/shared` are not
 * treated as unrestricted feature-to-feature access — only feature→feature
 * edges are in scope here. Door legality is enforced by `feature-door-contract`.
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

/** importer feature → (target feature → example file) */
function buildActualGraph(): Map<string, Map<string, string>> {
  const registered = new Set(APPLICATION_FEATURES.map((f) => f.name));
  const graph = new Map<string, Map<string, string>>();

  for (const feature of APPLICATION_FEATURES) {
    const edges = new Map<string, string>();
    for (const file of featureSourceFiles(feature.name)) {
      const content = readFileSync(file, 'utf8');
      for (const specifier of extractImports(content)) {
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
  const byName = new Map(APPLICATION_FEATURES.map((f) => [f.name, f]));

  for (const feature of APPLICATION_FEATURES) {
    const edges = actual.get(feature.name) ?? new Map();
    const allowed = new Set([
      ...feature.permittedDependencies,
      ...feature.deepImportSeams,
    ]);

    for (const [target, exampleFile] of edges) {
      if (allowed.has(target)) continue;
      addViolation(
        'Feature Dependencies',
        join(ROOT, exampleFile),
        `Feature "${feature.name}" imports "${target}" but neither permittedDependencies nor deepImportSeams declares it.`,
        `Add "${target}" to permittedDependencies for "${feature.name}" (or deepImportSeams if a justified seam).`,
      );
    }

    for (const dep of feature.permittedDependencies) {
      if (!byName.has(dep)) {
        addViolation(
          'Feature Dependencies',
          join(ROOT, feature.sourcePath),
          `Feature "${feature.name}" lists unknown permitted dependency "${dep}".`,
          'Remove the stale name or register the target feature.',
        );
        continue;
      }
      if (!edges.has(dep)) {
        addViolation(
          'Feature Dependencies',
          join(ROOT, feature.sourcePath),
          `Feature "${feature.name}" declares permitted dependency "${dep}" but no production import uses it.`,
          'Remove the stale permittedDependencies entry.',
        );
      }
    }

    for (const seam of feature.deepImportSeams) {
      if (!byName.has(seam)) {
        addViolation(
          'Feature Dependencies',
          join(ROOT, feature.sourcePath),
          `Feature "${feature.name}" lists unknown deepImportSeam "${seam}".`,
          'Remove the stale seam or register the target feature.',
        );
        continue;
      }
      if (!edges.has(seam)) {
        addViolation(
          'Feature Dependencies',
          join(ROOT, feature.sourcePath),
          `Feature "${feature.name}" declares deepImportSeam target "${seam}" but no production import uses that feature edge.`,
          'Remove the stale relationship; exact seam paths are governed separately by FEATURE_DEEP_IMPORT_SEAMS.',
        );
      }
    }
  }
}
