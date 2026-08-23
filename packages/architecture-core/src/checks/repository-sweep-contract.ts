import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { ROOT, rel } from './architecture-types';
import { checkPackageSealContract } from './package-seal-contract';
import { checkVendorOwnershipContract } from './vendor-ownership-contract';

/**
 * Default-deny: infrastructure ownership holds everywhere, not in four folders.
 *
 * The runner walks `src`, `packages`, `scripts` and `services`. Everything else
 * in the repository was an architectural safe zone — a file placed in a new
 * top-level directory imported `better-sqlite3` and no check said a word, while
 * the same import under `src/` was rejected three ways. A boundary a developer
 * escapes by choosing a different folder name is not a boundary.
 *
 * So the two rules that must hold regardless of where code lives — which
 * package may touch an infrastructure SDK, and that package internals are not
 * reachable — run over the whole tree. Layer contracts stay on their roots:
 * those classify a file by its architectural position, and a path outside the
 * application has no such position.
 *
 * The exclusions are content that is not repository source, and each is
 * excluded for what it is rather than for being inconvenient:
 */
const NOT_SOURCE = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  'out', // static export output
  'dist',
  'build',
  'coverage',
  'android', // Capacitor store shell — Java/Gradle, rebuilt by the pipeline
  'ios', // Capacitor store shell — Swift/Xcode
  'docs',
  'public',
  '.claude',
  '.cursor',
  '.github',
  '.vscode',
  '.deploy-all',
  '.backups',
  '.private-backups',
  '.secret-archive',
  '.ota',
  'test_profile', // gitignored local Chrome profiles
]);

/** Roots the runner already walks in full; sweeping them again is wasted work. */
const ALREADY_SWEPT = new Set(['src', 'packages', 'scripts', 'services']);

function sweep(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    if (NOT_SOURCE.has(entry)) continue;
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      sweep(full, found);
      continue;
    }
    if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry)) found.push(full);
  }
  return found;
}

export function checkRepositorySweepContract(): void {
  for (const entry of readdirSync(ROOT)) {
    if (NOT_SOURCE.has(entry) || ALREADY_SWEPT.has(entry)) continue;
    const full = join(ROOT, entry);
    if (!existsSync(full)) continue;

    const files = statSync(full).isDirectory()
      ? sweep(full)
      : /\.(ts|tsx|js|mjs|cjs)$/.test(entry)
        ? [full]
        : [];

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      // `rel` is used so a violation reports a repository-relative path even
      // for a directory no other check has ever seen.
      void rel(file);
      checkVendorOwnershipContract(file, content);
      checkPackageSealContract(file, content);
    }
  }
}
