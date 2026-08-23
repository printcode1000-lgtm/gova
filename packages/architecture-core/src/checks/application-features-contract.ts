/**
 * Application feature default-deny + structure contract.
 *
 * - Every `src/features/<name>` must be in APPLICATION_FEATURES
 * - Every registry entry must resolve on disk
 * - Forbidden application roots (`src/modules`, …) must not exist
 * - Only APPROVED_SRC_ROOTS may appear as top-level directories under `src/`
 * - Competing top-level feature folders (`entities`, `components`) are rejected
 */
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import {
  APPLICATION_FEATURES,
  APPROVED_SRC_ROOTS,
  FORBIDDEN_APP_ROOTS,
  featureByName,
} from '../registry/application-features-registry';
import { ROOT, addViolation } from './architecture-types';

const APPROVED = new Set<string>(APPROVED_SRC_ROOTS);
const FORBIDDEN = new Set<string>(FORBIDDEN_APP_ROOTS);

/** Competing layer names that must not appear as a direct child of a feature. */
const FORBIDDEN_FEATURE_TOP_FOLDERS = new Set(['entities', 'components', 'modules']);

export function checkApplicationFeatureRegistryContract(): void {
  const srcRoot = join(ROOT, 'src');
  if (!existsSync(srcRoot)) {
    addViolation(
      'Application Features',
      srcRoot,
      'src/ directory is missing.',
      'Restore the application source tree.',
    );
    return;
  }

  // Forbidden competing roots
  for (const name of FORBIDDEN) {
    const path = join(srcRoot, name);
    if (existsSync(path)) {
      addViolation(
        'Application Features',
        path,
        `Forbidden application root "src/${name}" exists.`,
        'Colocate feature code under src/features/<feature>/ and shared code under src/shared/.',
      );
    }
  }

  // Approved top-level directories only
  for (const entry of readdirSync(srcRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!APPROVED.has(entry.name)) {
      addViolation(
        'Application Features',
        join(srcRoot, entry.name),
        `Unknown top-level application directory "src/${entry.name}".`,
        `Allowed roots: ${[...APPROVED].join(', ')}. Register shared code under src/shared/ or a feature under src/features/.`,
      );
    }
  }

  const featuresRoot = join(srcRoot, 'features');
  if (!existsSync(featuresRoot)) {
    addViolation(
      'Application Features',
      featuresRoot,
      'src/features/ is missing.',
      'Restore the application features tree.',
    );
    return;
  }

  const onDisk = readdirSync(featuresRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  for (const name of onDisk) {
    if (!featureByName(name)) {
      addViolation(
        'Application Features',
        join(featuresRoot, name),
        `Feature folder "src/features/${name}" is not registered in APPLICATION_FEATURES.`,
        'Add it to packages/architecture-core/src/registry/application-features-registry.ts before it has architectural authority.',
      );
      continue;
    }

    // Competing vocabulary at feature top level
    const featurePath = join(featuresRoot, name);
    for (const child of readdirSync(featurePath, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      if (FORBIDDEN_FEATURE_TOP_FOLDERS.has(child.name)) {
        addViolation(
          'Application Features',
          join(featurePath, child.name),
          `Feature "${name}" uses forbidden top-level folder "${child.name}".`,
          'Use canonical vocabulary: domain (not entities), presentation (not components).',
        );
      }
    }

    // Declared doors must exist on disk
    const feature = featureByName(name)!;
    for (const door of feature.doors) {
      const file =
        door === '.'
          ? join(featurePath, 'index.ts')
          : join(featurePath, `${door.slice(2)}.ts`);
      const alt = file.replace(/\.ts$/, '.tsx');
      if (!existsSync(file) && !existsSync(alt)) {
        addViolation(
          'Application Features',
          file,
          `Feature "${name}" declares door "${door}" but the entry file is missing.`,
          'Create the door file or remove it from the registry.',
        );
      }
    }
  }

  for (const entry of APPLICATION_FEATURES) {
    if (!onDisk.includes(entry.name)) {
      addViolation(
        'Application Features',
        join(featuresRoot, entry.name),
        `Registry entry "${entry.name}" points at missing folder ${entry.sourcePath}.`,
        'Remove the stale registry entry or restore the feature.',
      );
    }
  }

  // Silence unused
  void statSync;
}
