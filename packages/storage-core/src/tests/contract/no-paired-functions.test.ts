import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

function getTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

export function runNoPairedFunctionsTest() {
  const root = process.cwd();
  const pkgSrc = path.join(root, 'packages', 'storage-core', 'src');
  const files = getTsFiles(pkgSrc);

  const PAIRED_PATTERN = /(Product|Ota)[A-Z]\w*(Object|Client|Credentials)/;

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const match = PAIRED_PATTERN.exec(content);
    assert.ok(
      !match,
      `Paired function duplication violation in ${path.relative(root, file)}: found "${match?.[0]}"`,
    );
  }

  console.log('✅ Contract test: no paired functions passed');
}
