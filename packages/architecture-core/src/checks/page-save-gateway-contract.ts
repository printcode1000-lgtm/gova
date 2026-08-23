import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { ROOT, addViolation, extractImports, rel, walk } from './architecture-types';

/**
 * `@asol/page-save-core` is the mandatory gateway for page-authored writes.
 *
 * This contract keeps two invariants green inside `architecture:check`:
 * 1. The package exists and exposes a single root door.
 * 2. Application UI code does not import deep paths into the package.
 *
 * The detailed write-surface allowlist remains in
 * `src/features/page-save/tests/page-save-write-surface.test.ts` and
 * `page-save-ownership.test.ts` — those run under `test:page-save-core`.
 * Folding their full AST scan here would duplicate a gate that already fails
 * the build; this check makes the ownership boundary visible to every
 * `architecture:check` run.
 */
export function checkPageSaveGatewayContract(): void {
  const manifestPath = join(ROOT, 'packages/page-save-core/package.json');
  if (!existsSync(manifestPath)) {
    addViolation(
      'Page Save Gateway',
      manifestPath,
      '@asol/page-save-core is missing.',
      'Restore the page-save-core package; page-authored writes have no other legal path.',
    );
    return;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    name?: string;
    exports?: Record<string, unknown>;
  };
  if (manifest.name !== '@asol/page-save-core') {
    addViolation(
      'Page Save Gateway',
      manifestPath,
      `page-save-core package name is ${manifest.name ?? '(missing)'}.`,
      'The mandatory gateway must remain @asol/page-save-core.',
    );
  }

  const doors = Object.keys(manifest.exports ?? {});
  if (doors.length !== 1 || doors[0] !== '.') {
    addViolation(
      'Page Save Gateway',
      manifestPath,
      `page-save-core exports doors: ${doors.join(', ') || '(none)'}.`,
      'Keep a single root door so page writes cannot reach internals.',
    );
  }

  const ownershipTest = join(
    ROOT,
    'src/features/page-save/tests/page-save-ownership.test.ts',
  );
  const writeSurfaceTest = join(
    ROOT,
    'src/features/page-save/tests/page-save-write-surface.test.ts',
  );
  for (const required of [ownershipTest, writeSurfaceTest]) {
    if (!existsSync(required)) {
      addViolation(
        'Page Save Gateway',
        required,
        `Required page-save enforcement test missing: ${rel(required)}.`,
        'Restore the ownership and write-surface contract tests.',
      );
    }
  }

  // Freeze the write-surface skip set. `api` is excluded because route handlers
  // persist through domain/data owners, not page-save; expanding this set is an
  // architectural decision and must update docs/01-architecture/07-enforcement/architecture-check.md.
  if (existsSync(writeSurfaceTest)) {
    const writeSurfaceSource = readFileSync(writeSurfaceTest, 'utf8');
    const skipMatch = writeSurfaceSource.match(
      /skippedDirectories\s*=\s*new Set\(\[([^\]]*)\]\)/,
    );
    const approvedSkip = ['node_modules', 'tests', '__tests__', 'api'].sort().join(',');
    const actualSkip = skipMatch
      ? [...skipMatch[1]!.matchAll(/["']([^"']+)["']/g)]
          .map((match) => match[1]!)
          .sort()
          .join(',')
      : '';
    if (!skipMatch || actualSkip !== approvedSkip) {
      addViolation(
        'Page Save Gateway',
        writeSurfaceTest,
        `page-save write-surface skippedDirectories is [${actualSkip || '(missing)'}].`,
        `Keep exactly [${approvedSkip}]. Document any change in repository-architecture-enforcement.md.`,
      );
    }
  }

  // Reject deep imports of page-save-core from application source.
  const srcRoot = join(ROOT, 'src');
  if (!existsSync(srcRoot)) return;
  for (const file of walk(srcRoot)) {
    const content = readFileSync(file, 'utf8');
    for (const specifier of extractImports(content)) {
      if (
        specifier.startsWith('@asol/page-save-core/') ||
        specifier.includes('packages/page-save-core/')
      ) {
        addViolation(
          'Page Save Gateway',
          file,
          `Deep import of page-save-core: "${specifier}".`,
          'Import only from @asol/page-save-core.',
        );
      }
    }
  }
}
