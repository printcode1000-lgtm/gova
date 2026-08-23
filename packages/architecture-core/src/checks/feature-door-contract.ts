/**
 * Sealed feature-door contract.
 *
 * Outside a feature, only declared doors (`@/features/<name>`, `/ui`, `/server`)
 * may be imported. Deep paths and relative traversal into another feature fail.
 * Dependencies must be listed on the importer's `permittedDependencies`.
 *
 * Composition packages are a deliberate special boundary: service mirrors are
 * built from their exact import graphs, so some deployment roots need a narrow
 * internal application module rather than a broad feature barrel. Those paths
 * are allowed only when listed exactly in COMPOSITION_FEATURE_SEAMS.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

import {
  featureByName,
  isFeatureDoorSpecifier,
} from '../registry/application-features-registry';
import { CAPABILITY_PACKAGES } from '../registry/capability-registry';
import {
  COMPOSITION_FEATURE_SEAMS,
  isCompositionFeatureSeam,
} from '../registry/composition-feature-seams-registry';
import { ROOT, SRC, addViolation, extractImports, walk, rel } from './architecture-types';

const FEATURE_PREFIX = 'src/features/';
const PACKAGE_BY_FOLDER = new Map(CAPABILITY_PACKAGES.map((pkg) => [pkg.folder, pkg]));

function featureOfPath(repoRel: string): string | null {
  if (!repoRel.startsWith(FEATURE_PREFIX)) return null;
  const rest = repoRel.slice(FEATURE_PREFIX.length);
  const name = rest.split('/')[0];
  return name || null;
}

function compositionPackageOfPath(repoRel: string): string | null {
  const match = repoRel.match(/^packages\/([^/]+)\/src\//);
  if (!match) return null;
  const folder = match[1]!;
  return PACKAGE_BY_FOLDER.get(folder)?.mayImportApp ? folder : null;
}

function resolveSpecifier(specifier: string, importerAbs: string): string | null {
  if (specifier.startsWith('@/')) return `src/${specifier.slice(2)}`;
  if (specifier.startsWith('.')) {
    const abs = resolve(dirname(importerAbs), specifier);
    return relative(ROOT, abs).replace(/\\/g, '/');
  }
  return null;
}

function sourcePathExists(repoPathWithoutExtension: string): boolean {
  const absolute = join(ROOT, repoPathWithoutExtension);
  return (
    existsSync(absolute) ||
    existsSync(`${absolute}.ts`) ||
    existsSync(`${absolute}.tsx`) ||
    existsSync(join(absolute, 'index.ts')) ||
    existsSync(join(absolute, 'index.tsx'))
  );
}

function validateCompositionFeatureSeamRegistry(): void {
  for (const [packageFolder, seams] of Object.entries(COMPOSITION_FEATURE_SEAMS)) {
    const pkg = PACKAGE_BY_FOLDER.get(packageFolder);
    if (!pkg || !pkg.mayImportApp) {
      addViolation(
        'Feature Doors',
        join(ROOT, 'packages', packageFolder),
        `COMPOSITION_FEATURE_SEAMS names "${packageFolder}", which is not a registered mayImportApp package.`,
        'Register only explicit composition/application-boundary packages.',
      );
    }

    const seen = new Set<string>();
    for (const specifier of seams) {
      if (seen.has(specifier)) {
        addViolation(
          'Feature Doors',
          join(ROOT, 'packages', packageFolder),
          `Duplicate composition feature seam "${specifier}".`,
          'Each exact seam must be registered once.',
        );
      }
      seen.add(specifier);

      const match = specifier.match(/^@\/features\/([^/]+)\/(.+)$/);
      if (!match || ['ui', 'server', 'index'].includes(match[2]!)) {
        addViolation(
          'Feature Doors',
          join(ROOT, 'packages', packageFolder),
          `Composition seam "${specifier}" is not an exact deep feature path.`,
          'Declared feature doors do not belong in the seam registry; import them normally.',
        );
        continue;
      }

      const featureName = match[1]!;
      if (!featureByName(featureName)) {
        addViolation(
          'Feature Doors',
          join(ROOT, 'packages', packageFolder),
          `Composition seam "${specifier}" targets unregistered feature "${featureName}".`,
          'Use a registered APPLICATION_FEATURES owner.',
        );
      }

      const repoPath = `src/${specifier.slice(2)}`;
      if (!sourcePathExists(repoPath)) {
        addViolation(
          'Feature Doors',
          join(ROOT, 'packages', packageFolder),
          `Composition seam "${specifier}" points at a missing source module.`,
          'Remove the stale seam or restore the exact module.',
        );
      }
    }
  }
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
    ) return true;
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
      ) continue;
      files.push(file);
    }
  }
  return files;
}

export function checkFeatureDoorContract(): void {
  validateCompositionFeatureSeamRegistry();

  const scanned = [...walk(SRC), ...productionCompositionSources()];
  const usedCompositionSeams = new Map<string, Set<string>>();

  for (const file of scanned) {
    const repoRel = rel(file);
    const importerFeature = featureOfPath(repoRel);
    const compositionPackage = compositionPackageOfPath(repoRel);
    const content = readFileSync(file, 'utf8');
    const imports = extractImports(content);

    for (const specifier of imports) {
      const deepAlias = specifier.match(/^@\/features\/([^/]+)\/(.+)$/);
      if (deepAlias) {
        const target = deepAlias[1]!;
        const rest = deepAlias[2]!;

        if (rest === 'ui' || rest === 'server') {
          validateDoorImport(repoRel, importerFeature, target, specifier);
          continue;
        }

        if (importerFeature === target) continue;

        if (compositionPackage && isCompositionFeatureSeam(compositionPackage, specifier)) {
          const used = usedCompositionSeams.get(compositionPackage) ?? new Set<string>();
          used.add(specifier);
          usedCompositionSeams.set(compositionPackage, used);
          continue;
        }

        addViolation(
          'Feature Doors',
          file,
          `Deep cross-feature import "${specifier}" bypasses declared doors.`,
          compositionPackage
            ? 'Register this exact path in COMPOSITION_FEATURE_SEAMS only if the service mirror requires a narrower graph; otherwise use a declared feature door.'
            : `Import through @/features/${target}, @/features/${target}/ui, or @/features/${target}/server.`,
        );
        continue;
      }

      const doorHit = isFeatureDoorSpecifier(specifier);
      if (doorHit) {
        validateDoorImport(repoRel, importerFeature, doorHit.feature, specifier);
        continue;
      }

      const resolved = resolveSpecifier(specifier, file);
      if (!resolved) continue;
      const targetFeatureResolved =
        featureOfPath(resolved) ??
        featureOfPath(`${resolved}.ts`) ??
        featureOfPath(`${resolved}.tsx`) ??
        featureOfPath(resolved.replace(/\/index$/, '') + '/index.ts');

      if (!targetFeatureResolved || importerFeature === targetFeatureResolved) continue;

      if (
        !isDeclaredDoorPath(targetFeatureResolved, resolved) &&
        !isDeclaredDoorPath(targetFeatureResolved, `${resolved}.ts`) &&
        !isDeclaredDoorPath(targetFeatureResolved, `${resolved}.tsx`)
      ) {
        addViolation(
          'Feature Doors',
          file,
          `Import "${specifier}" resolves into feature "${targetFeatureResolved}" internals.`,
          compositionPackage
            ? 'Composition seams must use an exact registered @/features/... alias; relative deep traversal is never allowed.'
            : `Use a declared door for @/features/${targetFeatureResolved}.`,
        );
        continue;
      }

      validateDoorImport(repoRel, importerFeature, targetFeatureResolved, specifier);
    }
  }

  for (const [packageFolder, seams] of Object.entries(COMPOSITION_FEATURE_SEAMS)) {
    const used = usedCompositionSeams.get(packageFolder) ?? new Set<string>();
    for (const specifier of seams) {
      if (used.has(specifier)) continue;
      addViolation(
        'Feature Doors',
        join(ROOT, 'packages', packageFolder),
        `Composition feature seam "${specifier}" is registered but unused.`,
        'Remove stale seam authority when the production import no longer exists.',
      );
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
