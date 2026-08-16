import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

function getTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      results.push(full);
    }
  }
  return results;
}

export function runRuntimePurityTest() {
  const rootDir = process.cwd();
  const pkgSrc = path.join(rootDir, 'packages', 'storage-core', 'src');
  
  // All files reachable by index.ts (i.e. outside src/server, src/adapters)
  const domainDir = path.join(pkgSrc, 'domain');
  const indexFile = path.join(pkgSrc, 'index.ts');
  const validationDir = path.join(pkgSrc, 'validation');
  const errorsDir = path.join(pkgSrc, 'errors');

  const filesToScan = [
    indexFile,
    ...getTsFiles(domainDir),
    ...getTsFiles(validationDir),
    ...getTsFiles(errorsDir),
  ];

  const BANNED_IMPORTS = [
    'fs',
    'node:fs',
    'path',
    'node:path',
    'child_process',
    'node:child_process',
    'crypto',
    'node:crypto',
    '@aws-sdk',
    'server-only',
  ];

  for (const file of filesToScan) {
    const content = readFileSync(file, 'utf8');
    for (const banned of BANNED_IMPORTS) {
      const regex = new RegExp(`from\\s+['"]${banned}['"]|import\\s+['"]${banned}['"]`);
      assert.ok(
        !regex.test(content),
        `Runtime purity violation in ${path.relative(rootDir, file)}: imported "${banned}"`,
      );
    }
  }

  console.log('✅ Contract test: runtime purity passed');
}
