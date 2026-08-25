/**
 * Default-deny repository hygiene: generated build trees, obsolete root logs,
 * and undeclared direct tooling dependencies cannot be tracked or introduced.
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

import { ROOT, addViolation } from './architecture-types';

const OBSOLETE_ROOT_LOGS = new Set(['build-output.log.bak', 'npm-build.log']);

const GENERATED_BUILD_PATTERNS = [
  /^packages\/[^/]+\/android\/build\//,
  /^packages\/[^/]+\/ios\/build\//,
];

const DECLARED_CONFIG_MODULES = [
  { file: 'eslint.config.js', specifiers: ['@next/eslint-plugin-next', '@typescript-eslint/parser'] },
];

function gitTrackedFiles(): string[] {
  try {
    const output = execFileSync('git', ['ls-files', '-z'], {
      cwd: ROOT,
      encoding: 'utf8',
      windowsHide: true,
    });
    return output.split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

function declaredNpmNames(): Set<string> {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]);
}

export function checkRepositoryHygieneContract(): void {
  const tracked = gitTrackedFiles();
  for (const file of tracked) {
    const posix = file.replace(/\\/g, '/');
    if (OBSOLETE_ROOT_LOGS.has(posix)) {
      addViolation(
        'Repository Hygiene',
        join(ROOT, file),
        `Obsolete root build log is tracked: ${posix}.`,
        'Delete the log. Release artifacts under android/app/build/outputs stay.',
      );
    }
    if (
      GENERATED_BUILD_PATTERNS.some((pattern) => pattern.test(posix)) &&
      !posix.startsWith('android/app/build/outputs/')
    ) {
      addViolation(
        'Repository Hygiene',
        join(ROOT, file),
        `Generated build output is tracked: ${posix}.`,
        'Untrack Gradle/Xcode build directories. Keep packages/native-core/android/.gitignore.',
      );
    }
  }

  const declared = declaredNpmNames();
  for (const entry of DECLARED_CONFIG_MODULES) {
    const source = readFileSync(join(ROOT, entry.file), 'utf8');
    for (const specifier of entry.specifiers) {
      const used = source.includes(`'${specifier}'`) || source.includes(`"${specifier}"`);
      if (used && !declared.has(specifier)) {
        addViolation(
          'Repository Hygiene',
          join(ROOT, entry.file),
          `Undeclared direct dependency ${specifier} is imported by ${entry.file}.`,
          'Declare the package in package.json instead of relying on a transitive install.',
        );
      }
    }
  }
}
