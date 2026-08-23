/**
 * Application-door purity: `@/features/<name>` (index.ts) must remain
 * isomorphic for server-capable features.
 *
 * Service mirrors follow the real module graph, not just the first re-export.
 * Therefore purity is checked transitively through every relative/local module
 * reachable from the application door. A local barrel cannot hide browser or
 * server poison one or more hops below `index.ts`.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

import { APPLICATION_FEATURES } from '../registry/application-features-registry';
import { ROOT, addViolation, extractImports } from './architecture-types';

const BROWSER_POISON = [
  '@asol/data-core/browser',
  '@asol/native-core',
];

const SERVER_PACKAGE_DOOR = /^@asol\/[^'"]+\/server(?:\/|$)/;
const CLIENT_DIRECTIVE = /^\s*['"]use client['"]\s*;?/m;

function resolveLocalModule(fromFile: string, specifier: string, featureRoot: string): string | null {
  let base: string | null = null;
  if (specifier.startsWith('.')) {
    base = resolve(dirname(fromFile), specifier);
  } else {
    const featurePrefix = `@/${featureRoot.slice(4)}/`;
    if (specifier.startsWith(featurePrefix)) {
      base = join(ROOT, 'src', specifier.slice(2));
    }
  }
  if (!base) return null;

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ]) {
    if (!existsSync(candidate)) continue;
    const rel = relative(join(ROOT, featureRoot), candidate).replace(/\\/g, '/');
    if (rel === '..' || rel.startsWith('../')) return null;
    return candidate;
  }
  return null;
}

function poisonReason(specifier: string): string | null {
  if (
    BROWSER_POISON.some(
      (poison) => specifier === poison || specifier.startsWith(`${poison}/`),
    )
  ) return `browser capability "${specifier}"`;
  if (SERVER_PACKAGE_DOOR.test(specifier)) return `server package door "${specifier}"`;
  if (specifier === 'server-only') return 'server-only marker';
  return null;
}

export function checkFeatureApplicationDoorPurityContract(): void {
  for (const feature of APPLICATION_FEATURES) {
    const serverCapable =
      feature.hasServer || feature.doors.includes('./server') || feature.runtimeTargets.includes('server');
    if (!serverCapable || !feature.doors.includes('.')) continue;

    const indexPath = join(ROOT, feature.sourcePath, 'index.ts');
    if (!existsSync(indexPath)) continue;

    const visited = new Set<string>();
    const stack: Array<{ file: string; chain: string[] }> = [
      { file: indexPath, chain: [`@/features/${feature.name}`] },
    ];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current.file)) continue;
      visited.add(current.file);

      const content = readFileSync(current.file, 'utf8');
      if (current.file !== indexPath && CLIENT_DIRECTIVE.test(content)) {
        addViolation(
          'Feature Door Purity',
          indexPath,
          `Application door @/features/${feature.name} reaches a client-only module through ${current.chain.join(' -> ')}.`,
          'Move that surface behind /ui; keep the application door isomorphic.',
        );
      }

      for (const specifier of extractImports(content)) {
        const reason = poisonReason(specifier);
        if (reason) {
          addViolation(
            'Feature Door Purity',
            indexPath,
            `Application door @/features/${feature.name} reaches ${reason} through ${current.chain.join(' -> ')}.`,
            'Move browser-only code to /ui and server-only code to /server.',
          );
          continue;
        }

        const target = resolveLocalModule(current.file, specifier, feature.sourcePath);
        if (!target) continue;
        const targetRel = relative(join(ROOT, feature.sourcePath), target).replace(/\\/g, '/');
        stack.push({
          file: target,
          chain: [...current.chain, targetRel],
        });
      }
    }
  }
}
