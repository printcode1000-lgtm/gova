import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import {
  CAPABILITY_PACKAGES,
  packageByFolder,
} from '../registry/capability-registry';
import { ROOT, addViolation, rel } from './architecture-types';

/**
 * Every sealed package on disk must appear in the capability registry, and every
 * registry entry must resolve to a real package whose `name` matches.
 */
export function checkCapabilityOwnershipContract(): void {
  const packagesRoot = join(ROOT, 'packages');
  if (!existsSync(packagesRoot)) {
    addViolation(
      'Capability Ownership',
      packagesRoot,
      'packages/ directory is missing.',
      'Restore the sealed package tree.',
    );
    return;
  }

  const onDisk = readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(packagesRoot, name, 'package.json')));

  for (const folder of onDisk) {
    const registered = packageByFolder(folder);
    if (!registered) {
      addViolation(
        'Capability Ownership',
        join(packagesRoot, folder),
        `Package folder "packages/${folder}" is not registered in the capability registry.`,
        'Add it to packages/architecture-core/src/registry/capability-registry.ts with a single owner statement.',
      );
      continue;
    }

    const manifest = JSON.parse(
      readFileSync(join(packagesRoot, folder, 'package.json'), 'utf8'),
    ) as { name?: string; exports?: Record<string, unknown> };

    if (manifest.name !== registered.name) {
      addViolation(
        'Capability Ownership',
        join(packagesRoot, folder, 'package.json'),
        `Registry name ${registered.name} does not match package.json name ${manifest.name ?? '(missing)'}.`,
        'Keep the registry and package.json name identical.',
      );
    }

    if (!manifest.exports || Object.keys(manifest.exports).length === 0) {
      addViolation(
        'Capability Ownership',
        join(packagesRoot, folder, 'package.json'),
        `${registered.name} declares no exports map.`,
        'Expose only intentional doors; never a wildcard "./*".',
      );
    } else if (Object.keys(manifest.exports).some((door) => door === './*' || door.endsWith('/*'))) {
      addViolation(
        'Capability Ownership',
        join(packagesRoot, folder, 'package.json'),
        `${registered.name} uses a wildcard export door.`,
        'Replace wildcard exports with an explicit door list.',
      );
    }
  }

  for (const entry of CAPABILITY_PACKAGES) {
    if (!onDisk.includes(entry.folder)) {
      addViolation(
        'Capability Ownership',
        join(packagesRoot, entry.folder),
        `Registry entry ${entry.name} points at missing folder packages/${entry.folder}.`,
        'Remove the stale registry entry or restore the package.',
      );
    }
  }

  // Silence unused in case rel is tree-shaken oddly in some runners.
  void rel;
}
