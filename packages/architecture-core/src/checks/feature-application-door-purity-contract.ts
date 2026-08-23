/**
 * Service-mirror feature-entry purity.
 *
 * A feature's `.` door is an application door, not necessarily an isomorphic
 * door: some features intentionally expose browser behaviour there while also
 * owning a separate `/server` surface. The boundary that must be server-safe is
 * narrower and concrete: every application module that a composition package
 * actually imports into an isolated service mirror.
 *
 * This contract therefore starts from real production imports in registered
 * `mayImportApp` packages and walks their reachable feature graph transitively.
 * A composition/service entry may use a public application/server door or an
 * exact COMPOSITION_FEATURE_SEAMS path, but it must never reach `/ui`, a
 * `use client` module, or browser-only capability doors.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

import { CAPABILITY_PACKAGES } from '../registry/capability-registry';
import { ROOT, addViolation, extractImports, rel, walk } from './architecture-types';

const FEATURES_ROOT = join(ROOT, 'src', 'features');
const BROWSER_POISON = [
  '@asol/data-core/browser',
  '@asol/native-core',
];
const CLIENT_DIRECTIVE = /^\s*['"]use client['"]\s*;?/m;

interface ServiceFeatureEntry {
  packageFolder: string;
  importerFile: string;
  specifier: string;
  targetFile: string;
}

function resolveSourceModule(base: string): string | null {
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.cjs`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
    join(base, 'index.js'),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function resolveFeatureModule(fromFile: string, specifier: string): string | null {
  let base: string | null = null;
  if (specifier.startsWith('@/features/')) {
    base = join(ROOT, 'src', specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    base = resolve(dirname(fromFile), specifier);
  }
  if (!base) return null;

  const target = resolveSourceModule(base);
  if (!target) return null;
  const targetRel = relative(FEATURES_ROOT, target).replace(/\\/g, '/');
  if (targetRel === '..' || targetRel.startsWith('../')) return null;
  return target;
}

function productionCompositionFiles(): Array<{ packageFolder: string; file: string }> {
  const files: Array<{ packageFolder: string; file: string }> = [];
  for (const pkg of CAPABILITY_PACKAGES) {
    if (!pkg.mayImportApp) continue;
    const src = join(ROOT, 'packages', pkg.folder, 'src');
    if (!existsSync(src)) continue;
    for (const file of walk(src)) {
      const fileRel = rel(file);
      if (
        fileRel.includes('/tests/') ||
        fileRel.includes('/__tests__/') ||
        /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(fileRel)
      ) continue;
      files.push({ packageFolder: pkg.folder, file });
    }
  }
  return files;
}

function collectServiceFeatureEntries(): ServiceFeatureEntry[] {
  const entries: ServiceFeatureEntry[] = [];
  for (const { packageFolder, file } of productionCompositionFiles()) {
    const content = readFileSync(file, 'utf8');
    for (const specifier of extractImports(content)) {
      if (!specifier.startsWith('@/features/')) continue;

      if (/^@\/features\/[^/]+\/ui(?:\/|$)/.test(specifier)) {
        addViolation(
          'Feature Door Purity',
          file,
          `Composition package "${packageFolder}" imports UI feature door "${specifier}".`,
          'Service mirrors may import application/server doors or exact registered composition seams, never /ui.',
        );
        continue;
      }

      const targetFile = resolveFeatureModule(file, specifier);
      if (!targetFile) continue;
      entries.push({ packageFolder, importerFile: file, specifier, targetFile });
    }
  }
  return entries;
}

function browserPoison(specifier: string): string | null {
  for (const poison of BROWSER_POISON) {
    if (specifier === poison || specifier.startsWith(`${poison}/`)) {
      return specifier;
    }
  }
  return null;
}

export function checkFeatureApplicationDoorPurityContract(): void {
  for (const entry of collectServiceFeatureEntries()) {
    const visited = new Set<string>();
    const reported = new Set<string>();
    const stack: Array<{ file: string; chain: string[] }> = [
      {
        file: entry.targetFile,
        chain: [
          `packages/${entry.packageFolder}`,
          entry.specifier,
        ],
      },
    ];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current.file)) continue;
      visited.add(current.file);

      const content = readFileSync(current.file, 'utf8');
      if (CLIENT_DIRECTIVE.test(content)) {
        const key = `client:${current.file}`;
        if (!reported.has(key)) {
          reported.add(key);
          addViolation(
            'Feature Door Purity',
            entry.importerFile,
            `Service-mirror entry "${entry.specifier}" reaches a client-only module through ${current.chain.join(' -> ')}.`,
            'Move the service dependency to a server-safe door/exact seam; client modules must remain outside isolated service graphs.',
          );
        }
      }

      for (const specifier of extractImports(content)) {
        const poison = browserPoison(specifier);
        if (poison) {
          const key = `browser:${current.file}:${poison}`;
          if (!reported.has(key)) {
            reported.add(key);
            addViolation(
              'Feature Door Purity',
              entry.importerFile,
              `Service-mirror entry "${entry.specifier}" reaches browser capability "${poison}" through ${current.chain.join(' -> ')}.`,
              'Use a server-safe feature module or exact composition seam that does not reach browser/native capability doors.',
            );
          }
          continue;
        }

        if (/^@\/features\/[^/]+\/ui(?:\/|$)/.test(specifier)) {
          const key = `ui:${current.file}:${specifier}`;
          if (!reported.has(key)) {
            reported.add(key);
            addViolation(
              'Feature Door Purity',
              entry.importerFile,
              `Service-mirror entry "${entry.specifier}" reaches UI door "${specifier}" through ${current.chain.join(' -> ')}.`,
              'UI doors are forbidden from service-mirror graphs.',
            );
          }
          continue;
        }

        const target = resolveFeatureModule(current.file, specifier);
        if (!target) continue;
        const targetRel = relative(FEATURES_ROOT, target).replace(/\\/g, '/');
        stack.push({
          file: target,
          chain: [...current.chain, targetRel],
        });
      }
    }
  }
}
