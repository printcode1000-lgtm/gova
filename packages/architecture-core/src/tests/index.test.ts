import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  ALLOWED_PROCESS_ENV_FILES,
  LAYER_LABELS,
  classifyLayer,
  normalizePath,
  runArchitectureCheck,
} from '../index';

const ROOT = process.cwd();
const PACKAGE = 'packages/architecture-core';

// ── Door contract ───────────────────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(path.join(ROOT, PACKAGE, 'package.json'), 'utf8')) as {
  exports: Record<string, unknown>;
};
assert.deepEqual(Object.keys(manifest.exports), ['.'], 'One door: the contract and its scan.');

// ── The package holds both halves ───────────────────────────────────────────
//
// The rules and the code enforcing them used to live in `src/` and `scripts/` respectively, and
// the checker reached across with `../../src/...` — the tooling for rule 5 breaking rule 5. This
// asserts the split cannot come back by re-adding such an import.
function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(ROOT, PACKAGE, 'src', dir), { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.ts')) out.push(path.join(dir, entry.name));
  }
  return out;
}

const files = [...sources('contracts'), ...sources('checks'), 'runner.ts', 'index.ts'];
assert.ok(files.length > 12, `Expected the contracts and the checks, found ${files.length}`);

/**
 * The only package doors this scan may reach. Both are layer-1 packages and neither knows the
 * application: the native-surface report asks `ota-core` what changed since the last store
 * release. Listed rather than pattern-matched, so a new dependency is a decision.
 */
const DECLARED_PACKAGE_DOORS = new Set(['@asol/ota-core/publishing']);

for (const file of files) {
  const text = readFileSync(path.join(ROOT, PACKAGE, 'src', file), 'utf8');
  for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const specifier = match[1]!;
    if (specifier.startsWith('node:') || specifier === 'fs' || specifier === 'path') continue;
    if (DECLARED_PACKAGE_DOORS.has(specifier)) continue;
    assert.ok(
      !specifier.startsWith('@/'),
      `${file} imports ${specifier}: this package must never reach the application it checks.`,
    );
    assert.ok(
      specifier.startsWith('.'),
      `${file} imports ${specifier}. This package reads the repository from disk; it must not ` +
        'import the application it checks, and it takes no third-party dependency.',
    );
    assert.ok(
      !specifier.includes('/src/'),
      `${file} reaches outside the package via ${specifier}.`,
    );
  }
}

// ── The CLI is a CLI ────────────────────────────────────────────────────────
const cli = readFileSync(path.join(ROOT, 'scripts/architecture-check.ts'), 'utf8');
assert.ok(cli.includes('runArchitectureCheck'), 'The CLI must run the package, not its own copy.');
assert.ok(
  !/\.\.\/src\/core\/architecture/.test(cli),
  'The CLI must not reach back into a second copy of the contract.',
);

// ── The contract still answers ──────────────────────────────────────────────
assert.equal(classifyLayer('src/app/api/orders/route.ts'), 'business-api');
assert.equal(classifyLayer('src/core/api/traced-route.ts'), 'business-api');
assert.equal(classifyLayer('src/core/config/public-env.ts'), 'configuration');
assert.equal(classifyLayer('src/core/composition/server-ports.ts'), 'configuration');
assert.equal(normalizePath('src\\app\\page.tsx'), 'src/app/page.tsx');
assert.ok(LAYER_LABELS['business-api']);

// Every allowlisted `process.env` reader must still exist. An allowlist naming a deleted file is
// how an exemption outlives the reason for it.
for (const file of ALLOWED_PROCESS_ENV_FILES) {
  if (file.endsWith('.json')) continue;
  assert.ok(
    readFileSync(path.join(ROOT, file), 'utf8').length > 0,
    `${file} is allowlisted to read process.env but no longer exists.`,
  );
}

assert.equal(typeof runArchitectureCheck, 'function');

console.log(
  `@asol/architecture-core contract: 1 door, ${files.length} rule and check modules, no import of the application.`,
);
