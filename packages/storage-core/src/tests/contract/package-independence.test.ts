import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

function getTsSourceFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'tests') {
        results.push(...getTsSourceFiles(full));
      }
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

export function runPackageIndependenceTest() {
  const root = process.cwd();
  const storageCoreFiles = getTsSourceFiles(path.join(root, 'packages', 'storage-core', 'src'));
  const otaCoreFiles = getTsSourceFiles(path.join(root, 'packages', 'ota-core', 'src'));

  const otaPackageName = ['@asol', 'ota-core'].join('/');
  const storagePackageName = ['@asol', 'storage-core'].join('/');

  // 1. storage-core source files must never import @asol/ota-core
  for (const file of storageCoreFiles) {
    const content = readFileSync(file, 'utf8');
    assert.ok(
      !content.includes(otaPackageName),
      `Package independence violation: ${path.relative(root, file)} imports ${otaPackageName}`,
    );
  }

  // 2. ota-core source files must never import @asol/storage-core
  for (const file of otaCoreFiles) {
    const content = readFileSync(file, 'utf8');
    assert.ok(
      !content.includes(storagePackageName),
      `Package independence violation: ${path.relative(root, file)} imports ${storagePackageName}`,
    );
  }

  console.log('✅ Contract test: package independence passed');
}
