import { join } from 'path';

import { CAPABILITY_PACKAGES } from '../registry/capability-registry';
import { ROOT, addViolation, extractImports, rel } from './architecture-types';

/**
 * Capability packages must not import application code through the @/ alias.
 *
 * Composition packages are the designated composition roots for account
 * services and may import @/. Bridge packages must also use ports — the
 * registry marks mayImportApp false for them after the inversion.
 *
 * Test files under tests directories or *.test.ts may mention @/ in string
 * fixtures (for example asserting that a scanner rejects it); they are still
 * scanned, but only real import declarations are considered.
 */
export function checkPackageAppImportContract(filePath: string, content: string): void {
  const fileRel = rel(filePath);
  if (!fileRel.startsWith('packages/')) return;
  if (/\.test\.(ts|tsx|js|mjs|cjs)$/.test(fileRel) || fileRel.includes('/tests/')) return;

  const folder = fileRel.split('/')[1];
  if (!folder) return;

  const entry = CAPABILITY_PACKAGES.find((candidate) => candidate.folder === folder);
  if (!entry || entry.mayImportApp) return;

  // Contract / rule text inside architecture-core quotes the forbidden pattern.
  if (folder === 'architecture-core' && fileRel.includes('/registry/')) return;
  if (folder === 'architecture-core' && fileRel.includes('/checks/')) return;

  for (const specifier of extractImports(content)) {
    if (specifier === '@' || specifier.startsWith('@/')) {
      addViolation(
        'Package App Import Boundary',
        filePath,
        `${entry.name} (${entry.layer}) imports application module "${specifier}".`,
        'Depend on a port declared inside the package and wire it from src/core/composition or a *-composition package.',
      );
    }
  }
}

/** Walk helper used by the runner for package-only scans. */
export function packageRootFor(folder: string): string {
  return join(ROOT, 'packages', folder);
}
