import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

import { APPLICATION_FEATURES } from '../registry/application-features-registry';
import { ROOT, rel, violations } from './architecture-types';

/**
 * Canonical top-level anatomy for every application feature.
 *
 * Feature-specific implementation belongs to one of these architectural layers.
 * Secondary concerns such as hooks, services, config, validation, types, runtime,
 * context, processing, utils, public, and shared may exist only *inside* their
 * owning architectural layer; they are never peer layers at the feature root.
 */
export const CANONICAL_FEATURE_ROOT_DIRECTORIES = [
  'domain',
  'application',
  'infrastructure',
  'presentation',
  'ports',
  'server',
  'tests',
] as const;

export const FORBIDDEN_FEATURE_ROOT_DIRECTORIES = [
  'hooks',
  'services',
  'utils',
  'config',
  'public',
  'shared',
  'runtime',
  'context',
  'processing',
  'validation',
  'types',
  'components',
  'entities',
] as const;

const canonical = new Set<string>(CANONICAL_FEATURE_ROOT_DIRECTORIES);

function addViolation(path: string, message: string): void {
  violations.push({
    layer: 'Feature Anatomy',
    file: rel(path),
    violation: message,
  });
}

/**
 * Enforce one physical vocabulary across all registered features.
 * There is deliberately no compatibility allowance for legacy feature buckets.
 */
export function checkFeatureAnatomyContract(): void {
  for (const feature of APPLICATION_FEATURES) {
    const root = join(ROOT, feature.sourcePath);
    if (!existsSync(root)) continue;

    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const absolute = join(root, entry.name);
      if (canonical.has(entry.name)) continue;
      addViolation(
        absolute,
        `Feature "${feature.name}" has non-canonical root directory "${entry.name}". ` +
          `Move it under domain/application/infrastructure/presentation/ports/server/tests.`,
      );
    }
  }
}
