/**
 * Sealed feature-door contract.
 *
 * Outside a feature, only declared doors (`@/features/<name>`, `/ui`, `/server`)
 * may be imported. Deep paths and relative traversal into another feature fail.
 * Dependencies must be listed on the importer's `permittedDependencies`.
 *
 * Two exact, default-deny seam registries exist for the rare cases where a
 * public barrel would widen an import graph or where an already-established
 * cross-feature internal edge cannot safely be changed as part of an
 * architecture-only refactor:
 * - FEATURE_DEEP_IMPORT_SEAMS for feature-to-feature imports.
 * - COMPOSITION_FEATURE_SEAMS for isolated composition/service-mirror roots.
 *
 * Target-feature declarations alone never grant deep-import authority.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

import {
  APPLICATION_FEATURES,
  featureByName,
  isFeatureDoorSpecifier,
} from '../registry/application-features-registry';
import { CAPABILITY_PACKAGES } from '../registry/capability-registry';
import {
  COMPOSITION_FEATURE_SEAMS,
  isCompositionFeatureSeam,
} from '../registry/composition-feature-seams-registry';
import {
  FEATURE_DEEP_IMPORT_SEAMS,
  isFeatureDeepImportSeam,
} from '../registry/feature-deep-import-seams-registry';
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

function normalizeModulePath(repoPath: string): string {
  return repoPath.replace(/\.(?:ts|tsx)$/, '');
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

function validateFeatureDeepImportSeamRegistry(): void {
  for (const [importerFeature, seams] of Object.entries(FEATURE_DEEP_IMPORT_SEAMS)) {
    const importer = featureByName(importerFeature);
    if (!importer) {
      addViolation(
        'Feature Doors',
        join(ROOT, 'src/features', importerFeature),
        `FEATURE_DEEP_IMPORT_SEAMS names unregistered importer feature "${importerFeature}".`,
        'Register the feature first or remove the stale seam entry.',
      );
      continue;
    }

    const seen = new Set<string>();
    for (const repoPath of seams) {
      if (seen.has(repoPath)) {
        addViolation(
          'Feature Doors',
          join(ROOT, importer.sourcePath),
          `Duplicate feature deep-import seam "${repoPath}".`,
          'Each exact seam must be registered once.',
        );
      }
      seen.add(repoPath);

      const targetFeature = featureOfPath(repoPath);
      if (!targetFeature || targetFeature === importerFeature || !featureByName(targetFeature)) {
        addViolation(
          'Feature Doors',
          join(ROOT, importer.sourcePath),
          `Feature deep-import seam "${repoPath}" does not target another registered feature.`,
          'Register only exact modules under another src/features/<feature> owner.',
        );
        continue;
      }

      if (!importer.deepImportSeams.includes(targetFeature)) {
        addViolation(
          'Feature Doors',
          join(ROOT, importer.sourcePath),
          `Exact seam "${repoPath}" targets "${targetFeature}", but that target is not declared in ${importerFeature}.deepImportSeams.`,
          'Declare the target relationship in APPLICATION_FEATURES and the exact path here; neither declaration grants authority alone.',
        );
      }

      if (!sourcePathExists(repoPath)) {
        addViolation(
          'Feature Doors',
          join(ROOT, importer.sourcePath),
          `Feature deep-import seam "${repoPath}" points at a missing source module.`,
          'Remove the stale seam or restore the exact target module.',
        );
      }
    }
  }

  for (const importer of APPLICATION_FEATURES) {
    for (const targetFeature of importer.deepImportSeams) {
      const exact = FEATURE_DEEP_IMPORT_SEAMS[
        importer.name as keyof typeof FEATURE_DEEP_IMPORT_SEAMS
      ] as readonly string[] | undefined;
      const hasExactTarget = exact?.some((repoPath) => featureOfPath(repoPath) === targetFeature) ?? false;
      if (!hasExactTarget) {
        addViolation(
          'Feature Doors',
          join(ROOT, importer.sourcePath),
          `Feature "${importer.name}" declares deepImportSeams target "${targetFeature}" without any exact registered path.`,
          'Add only the required exact path to FEATURE_DEEP_IMPORT_SEAMS or remove the broad target declaration.',
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
  validateFeatureDeepImportSeamRegistry();

  const scanned = [...walk(SRC), ...productionCompositionSources()];
  const usedCompositionSeams = new Map<string, Set<string>>();
  const usedFeatureSeams = new Map<string, Set<string>>();

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

        const repoTarget = normalizeModulePath(`src/${specifier.slice(2)}`);
        if (importerFeature && isFeatureDeepImportSeam(importerFeature, repoTarget)) {
          const used = usedFeatureSeams.get(importerFeature) ?? new Set<string>();
          used.add(repoTarget);
          usedFeatureSeams.set(importerFeature, used);
          continue;
        }

        addViolation(
          'Feature Doors',
          file,
          `Deep cross-feature import "${specifier}" bypasses declared doors.`,
          compositionPackage
            ? 'Register this exact path in COMPOSITION_FEATURE_SEAMS only if the service mirror requires a narrower graph; otherwise use a declared feature door.'
            : `Import through @/features/${target}, @/features/${target}/ui, or @/features/${target}/server. If a deep edge is genuinely unavoidable, register only its exact source module in FEATURE_DEEP_IMPORT_SEAMS.`,
        );
        continue;
      }

      const doorHit = isFeatureDoorSpecifier(specifier);
      if (doorHit) {
        validateDoorImport(repoRel, importerFeature, doorHit.feature, specifier);
        continue;
      }

      const resolvedRaw = resolveSpecifier(specifier, file);
      if (!resolvedRaw) continue;
      const resolved = normalizeModulePath(resolvedRaw);
      const targetFeatureResolved =
        featureOfPath(resolved) ??
        featureOfPath(`${resolved}.ts`) ??
        featureOfPath(`${resolved}.tsx`) ??
        featureOfPath(resolved.replace(/\/index$/, '') + '/index.ts');

      if (!targetFeatureResolved || importerFeature === targetFeatureResolved) continue;

      if (importerFeature && isFeatureDeepImportSeam(importerFeature, resolved)) {
        const used = usedFeatureSeams.get(importerFeature) ?? new Set<string>();
        used.add(resolved);
        usedFeatureSeams.set(importerFeature, used);
        continue;
      }

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
            : `Use a declared door for @/features/${targetFeatureResolved}, or register only the exact unavoidable module in FEATURE_DEEP_IMPORT_SEAMS.`,
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

  for (const [importerFeature, seams] of Object.entries(FEATURE_DEEP_IMPORT_SEAMS)) {
    const used = usedFeatureSeams.get(importerFeature) ?? new Set<string>();
    for (const repoPath of seams) {
      if (used.has(normalizeModulePath(repoPath))) continue;
      addViolation(
        'Feature Doors',
        join(ROOT, 'src/features', importerFeature),
        `Feature deep-import seam "${repoPath}" is registered but unused.`,
        'Remove stale seam authority when the production/test import no longer exists.',
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
