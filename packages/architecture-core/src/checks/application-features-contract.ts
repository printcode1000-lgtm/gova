/**
 * Application feature default-deny + structure contract.
 *
 * - Every `src/features/<name>` must be in APPLICATION_FEATURES
 * - Every registry entry must resolve on disk
 * - Forbidden application roots (`src/modules`, …) must not exist
 * - Only APPROVED_SRC_ROOTS may appear as top-level directories under `src/`
 * - Feature top-level folders must use FEATURE_INTERNAL_VOCABULARY
 */
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

import {
  APPLICATION_FEATURES,
  APPROVED_SRC_ROOTS,
  FEATURE_INTERNAL_VOCABULARY,
  FORBIDDEN_APP_ROOTS,
  featureByName,
} from '../registry/application-features-registry';
import { CAPABILITY_PACKAGES } from '../registry/capability-registry';
import { ROOT, addViolation } from './architecture-types';

const APPROVED = new Set<string>(APPROVED_SRC_ROOTS);
const FORBIDDEN = new Set<string>(FORBIDDEN_APP_ROOTS);
const PACKAGE_NAMES = new Set(CAPABILITY_PACKAGES.map((p) => p.name));
const FEATURE_FOLDERS = new Set<string>(FEATURE_INTERNAL_VOCABULARY);

/** Legacy competing names are called out with a more specific remediation. */
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

  const seenNames = new Set<string>();
  const seenPaths = new Set<string>();
  for (const entry of APPLICATION_FEATURES) {
    if (seenNames.has(entry.name)) {
      addViolation(
        'Application Features',
        join(ROOT, entry.sourcePath),
        `Duplicate APPLICATION_FEATURES name "${entry.name}".`,
        'Each feature name must appear exactly once in the registry.',
      );
    }
    seenNames.add(entry.name);

    if (seenPaths.has(entry.sourcePath)) {
      addViolation(
        'Application Features',
        join(ROOT, entry.sourcePath),
        `Duplicate APPLICATION_FEATURES sourcePath "${entry.sourcePath}".`,
        'Each sourcePath must appear exactly once in the registry.',
      );
    }
    seenPaths.add(entry.sourcePath);

    const expectedPath = `src/features/${entry.name}`;
    if (entry.sourcePath !== expectedPath) {
      addViolation(
        'Application Features',
        join(ROOT, entry.sourcePath),
        `Registry entry "${entry.name}" has sourcePath "${entry.sourcePath}" but must be "${expectedPath}".`,
        'Keep sourcePath identical to src/features/<name>.',
      );
    }

    if (!existsSync(join(ROOT, entry.sourcePath))) {
      addViolation(
        'Application Features',
        join(ROOT, entry.sourcePath),
        `Registry entry "${entry.name}" points at missing path ${entry.sourcePath}.`,
        'Restore the feature folder or remove the registry entry.',
      );
    }

    for (const owner of entry.capabilityOwners) {
      if (!PACKAGE_NAMES.has(owner)) {
        addViolation(
          'Application Features',
          join(ROOT, entry.sourcePath),
          `Feature "${entry.name}" lists unknown capability owner "${owner}".`,
          'Use a name from CAPABILITY_PACKAGES or clear the owner list.',
        );
      }
    }

    for (const dep of entry.permittedDependencies) {
      if (dep === entry.name) {
        addViolation(
          'Application Features',
          join(ROOT, entry.sourcePath),
          `Feature "${entry.name}" lists itself in permittedDependencies.`,
          'Remove the self-dependency.',
        );
      }
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
        continue;
      }
      if (!FEATURE_FOLDERS.has(child.name)) {
        addViolation(
          'Application Features',
          join(featurePath, child.name),
          `Feature "${name}" uses unregistered top-level folder vocabulary "${child.name}".`,
          `Use one of: ${[...FEATURE_FOLDERS].join(', ')}. If a new architectural layer is genuinely required, add it once to FEATURE_INTERNAL_VOCABULARY with documentation and enforcement.`,
        );
      }
    }

    const feature = featureByName(name)!;
    for (const door of feature.doors) {
      const file = door === '.'
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
}
