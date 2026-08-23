/**
 * Sealed feature-door contract.
 *
 * Outside a feature, only declared doors (`@/features/<name>`, `/ui`, `/server`)
 * may be imported. Deep paths and relative traversal into another feature fail.
 * Dependencies must be listed on the importer's `permittedDependencies`.
 * Composition packages are allowed to import the application, but only through
 * those same declared doors — `mayImportApp` is not a deep-import bypass.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

import {
  featureByName,
  isFeatureDoorSpecifier,
} from '../registry/application-features-registry';
import { CAPABILITY_PACKAGES } from '../registry/capability-registry';
import { ROOT, SRC, addViolation, extractImports, walk, rel } from './architecture-types';

const FEATURE_PREFIX = 'src/features/';

/** Files that may mention internal feature paths as strings (generators, tests of the contract). */
const PATH_MENTION_EXEMPT = new Set<string>([
  'packages/architecture-core/src/checks/application-features-contract.ts',
  'packages/architecture-core/src/checks/feature-door-contract.ts',
  'packages/architecture-core/src/checks/application-features-attack.test.ts',
  'packages/architecture-core/src/registry/application-features-registry.ts',
  'scripts/refactor/seal-feature-doors.ts',
  'scripts/refactor/generate-application-features-registry.ts',
  'scripts/architecture/generate-architecture-docs.ts',
]);

function featureOfPath(repoRel: string): string | null {
  if (!repoRel.startsWith(FEATURE_PREFIX)) return null;
  const rest = repoRel.slice(FEATURE_PREFIX.length);
  const name = rest.split('/')[0];
  return name || null;
}

function resolveSpecifier(specifier: string, importerAbs: string): string | null {
  if (specifier.startsWith('@/')) {
    return `src/${specifier.slice(2)}`;
  }
  if (specifier.startsWith('.')) {
    const abs = resolve(dirname(importerAbs), specifier);
    return relative(ROOT, abs).replace(/\\/g, '/');
  }
  return null;
}

function isDeclaredDoorPath(feature: string, repoRel: string): boolean {
  const entry = featureByName(feature);
  if (!entry) return false;
  for (const door of entry.doors) {
    const doorFile = door === '.'
      ? `${entry.sourcePath}/index`
      : `${entry.sourcePath}/${door.slice(2)}`;
    if (
      repoRel === doorFile ||
      repoRel === `${doorFile}.ts` ||
      repoRel === `${doorFile}.tsx`
    ) {
      return true;
    }
  }
  return false;
}

function productionCompositionSources(): string[] {
  const files: string[] = [];
  for (const pkg of CAPABILITY_PACKAGES) {
    if (!pkg.mayImportApp) continue;
    const src = join(ROOT, 'packages', pkg.folder, 'src');
    if (!existsSync(src)) continue;
    for (const file of walk(src)) {
      const repoRel = rel(file);
      if (
        repoRel.includes('/tests/') ||
        repoRel.includes('/__tests__/') ||
        /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(repoRel)
      ) {
        continue;
      }
      files.push(file);
    }
  }
  return files;
}

export function checkFeatureDoorContract(): void {
  const scanned = [
    ...walk(SRC),
    ...productionCompositionSources(),
  ];

  for (const file of scanned) {
    const repoRel = rel(file);
    if (PATH_MENTION_EXEMPT.has(repoRel)) continue;
    if (repoRel.startsWith('packages/architecture-core/')) continue;

    const importerFeature = featureOfPath(repoRel);
    const content = readFileSync(file, 'utf8');
    const imports = extractImports(content);

    for (const specifier of imports) {
      // Alias deep import: @/features/foo/bar/...
      const deepAlias = specifier.match(/^@\/features\/([^/]+)\/(.+)$/);
      if (deepAlias) {
        const target = deepAlias[1]!;
        const rest = deepAlias[2]!;

        if (rest === 'ui' || rest === 'server') {
          validateDoorImport(repoRel, importerFeature, target, specifier);
          continue;
        }

        // A feature may use its own internals directly. Everyone else — including
        // composition packages — must use a declared public door. In particular,
        // `/index` is not a separate public alias for the `.` door.
        if (importerFeature === target) continue;

        // Justified deep-import seams are legacy feature-to-feature exceptions.
        // They never grant composition packages unrestricted application access.
        const importer = importerFeature ? featureByName(importerFeature) : undefined;
        if (importer?.deepImportSeams.includes(target)) continue;

        addViolation(
          'Feature Doors',
          file,
          `Deep cross-feature import "${specifier}" bypasses declared doors.`,
          `Import through @/features/${target}, @/features/${target}/ui, or @/features/${target}/server.`,
        );
        continue;
      }

      // Exact declared door alias.
      const doorHit = isFeatureDoorSpecifier(specifier);
      if (doorHit) {
        validateDoorImport(repoRel, importerFeature, doorHit.feature, specifier);
        continue;
      }

      // Relative / @/ resolution into another feature.
      const resolved = resolveSpecifier(specifier, file);
      if (!resolved) continue;
      const targetFeatureResolved =
        featureOfPath(resolved) ??
        featureOfPath(`${resolved}.ts`) ??
        featureOfPath(`${resolved}.tsx`) ??
        featureOfPath(resolved.replace(/\/index$/, '') + '/index.ts');

      if (!targetFeatureResolved) continue;
      if (importerFeature === targetFeatureResolved) continue;

      const importerEntry = importerFeature ? featureByName(importerFeature) : undefined;
      if (importerEntry?.deepImportSeams.includes(targetFeatureResolved)) continue;

      if (
        !isDeclaredDoorPath(targetFeatureResolved, resolved) &&
        !isDeclaredDoorPath(targetFeatureResolved, `${resolved}.ts`) &&
        !isDeclaredDoorPath(targetFeatureResolved, `${resolved}.tsx`)
      ) {
        addViolation(
          'Feature Doors',
          file,
          `Import "${specifier}" resolves into feature "${targetFeatureResolved}" internals.`,
          `Use a declared door for @/features/${targetFeatureResolved}.`,
        );
        continue;
      }

      validateDoorImport(repoRel, importerFeature, targetFeatureResolved, specifier);
    }
  }
}

function validateDoorImport(
  importerRel: string,
  importerFeature: string | null,
  targetFeature: string,
  specifier: string,
): void {
  const target = featureByName(targetFeature);
  if (!target) {
    addViolation(
      'Feature Doors',
      join(ROOT, importerRel),
      `Import "${specifier}" targets unregistered feature "${targetFeature}".`,
      'Register the feature in APPLICATION_FEATURES.',
    );
    return;
  }

  if (specifier.startsWith('@/features/')) {
    const doorMatch = specifier.match(/^@\/features\/([^/]+)(?:\/(ui|server))?$/);
    if (!doorMatch) {
      addViolation(
        'Feature Doors',
        join(ROOT, importerRel),
        `Import "${specifier}" is not a declared feature-door specifier.`,
        `Use one of the declared doors for @/features/${targetFeature}.`,
      );
    } else {
      const door: import('../registry/application-features-registry').FeatureDoor =
        doorMatch[2] === 'ui' ? './ui' : doorMatch[2] === 'server' ? './server' : '.';
      if (!target.doors.includes(door)) {
        addViolation(
          'Feature Doors',
          join(ROOT, importerRel),
          `Import "${specifier}" uses undeclared door for feature "${targetFeature}".`,
          `Declared doors: ${target.doors.join(', ') || '(none)'}.`,
        );
      }
    }
  }

  if (importerFeature && importerFeature !== targetFeature) {
    const importer = featureByName(importerFeature);
    if (importer && !importer.permittedDependencies.includes(targetFeature)) {
      addViolation(
        'Feature Doors',
        join(ROOT, importerRel),
        `Feature "${importerFeature}" imports "${targetFeature}" but that dependency is not permitted.`,
        `Add "${targetFeature}" to permittedDependencies for "${importerFeature}" in APPLICATION_FEATURES.`,
      );
    }
  }
}
