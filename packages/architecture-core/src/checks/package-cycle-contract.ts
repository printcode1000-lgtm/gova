import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { CAPABILITY_PACKAGES } from '../registry/capability-registry';
import { ROOT, addViolation, extractImports, rel } from './architecture-types';

/**
 * No package may depend on a package that depends on it.
 *
 * A cycle is not a style problem: two packages in one cannot be reasoned about,
 * extracted, tested, or deployed apart, and the seal between them stops meaning
 * anything. Type-only edges count — `import type` is erased at runtime, but a
 * type cycle still makes the boundary unresolvable on paper, and it is one
 * refactor away from carrying a value.
 *
 * Tests are excluded: a package's own tests routinely reach for another
 * package's fixtures, and that never ships.
 */
function sourceFiles(directory: string, found: string[] = []): string[] {
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'tests' || entry === '__tests__') continue;
      sourceFiles(full, found);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) continue;
    found.push(full);
  }
  return found;
}

/** package name → the packages it imports, with one example file each. */
function buildGraph(): Map<string, Map<string, string>> {
  const names = CAPABILITY_PACKAGES.map((entry) => entry.name);
  const graph = new Map<string, Map<string, string>>();

  for (const entry of CAPABILITY_PACKAGES) {
    const edges = new Map<string, string>();
    for (const file of sourceFiles(join(ROOT, 'packages', entry.folder, 'src'))) {
      for (const specifier of extractImports(readFileSync(file, 'utf8'))) {
        const target = names.find(
          (name) => specifier === name || specifier.startsWith(`${name}/`),
        );
        if (!target || target === entry.name) continue;
        if (!edges.has(target)) edges.set(target, rel(file));
      }
    }
    graph.set(entry.name, edges);
  }
  return graph;
}

export function checkPackageCycleContract(): void {
  const graph = buildGraph();
  const state = new Map<string, 'visiting' | 'done'>();
  const reported = new Set<string>();

  const walk = (name: string, stack: string[]): void => {
    state.set(name, 'visiting');
    stack.push(name);

    for (const [target, exampleFile] of graph.get(name) ?? []) {
      if (state.get(target) === 'visiting') {
        const cycle = [...stack.slice(stack.indexOf(target)), target];
        // One report per cycle, whichever member is reached first.
        const signature = [...cycle].sort().join('|');
        if (reported.has(signature)) continue;
        reported.add(signature);
        addViolation(
          'Package Cycles',
          join(ROOT, exampleFile),
          `Circular package dependency: ${cycle.join(' -> ')}.`,
          'Invert one edge: name a port in the package that needs the capability and wire the implementation in a composition root, or move the shared type down to the package that owns the data.',
        );
        continue;
      }
      if (state.get(target) !== 'done') walk(target, stack);
    }

    stack.pop();
    state.set(name, 'done');
  };

  for (const name of [...graph.keys()].sort()) {
    if (!state.has(name)) walk(name, []);
  }
}
