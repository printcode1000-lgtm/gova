/**
 * Application-door purity: `@/features/<name>` (index.ts) must not re-export
 * modules that import browser-only capability doors.
 *
 * Service mirrors walk `export *` without distinguishing `import type`, so a
 * single client adapter on the application door poisons every isolated
 * deployment that imports a domain type from that door.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { APPLICATION_FEATURES } from '../registry/application-features-registry';
import { ROOT, addViolation, extractImports } from './architecture-types';

const BROWSER_POISON = [
  '@asol/data-core/browser',
  '@asol/native-core',
];

const SERVER_PACKAGE_DOOR = /^@asol\/[^'"]+\/server$/;

function resolveExportTarget(featureRoot: string, fromSpec: string): string | null {
  const base = join(ROOT, featureRoot, fromSpec);
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function checkFeatureApplicationDoorPurityContract(): void {
  for (const feature of APPLICATION_FEATURES) {
    // Browser-only features may expose client adapters on `.` — service mirrors
    // never enter those graphs. Server-capable features must keep `.` isomorphic.
    const serverCapable =
      feature.hasServer || feature.doors.includes('./server') || feature.runtimeTargets.includes('server');
    if (!serverCapable) continue;

    const indexPath = join(ROOT, feature.sourcePath, 'index.ts');
    if (!existsSync(indexPath)) continue;
    const content = readFileSync(indexPath, 'utf8');
    const exportStar = content.matchAll(/export\s+\*\s+from\s+['"](\.[^'"]+)['"]/g);
    for (const match of exportStar) {
      const fromSpec = match[1]!;
      const target = resolveExportTarget(feature.sourcePath, fromSpec);
      if (!target) continue;
      const targetContent = readFileSync(target, 'utf8');
      const imports = extractImports(targetContent);
      for (const specifier of imports) {
        if (
          BROWSER_POISON.some(
            (poison) => specifier === poison || specifier.startsWith(`${poison}/`),
          ) ||
          SERVER_PACKAGE_DOOR.test(specifier) ||
          specifier === 'server-only'
        ) {
          addViolation(
            'Feature Door Purity',
            indexPath,
            `Application door @/features/${feature.name} re-exports ${fromSpec}, which imports browser/server poison "${specifier}". Move that module to /ui (or /server).`,
          );
        }
      }
    }
  }
}
