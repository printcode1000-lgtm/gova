import assert from 'node:assert/strict';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  ALLOWED_PROCESS_ENV_FILES,
  LAYER_LABELS,
  checkApplicationFeatureRegistryContract,
  checkFeatureDoorContract,
  classifyLayer,
  normalizePath,
  runArchitectureCheck,
  violations,
} from '../index';
import './application-cycle-contract.test';
import './dom-identity-repetition.test';

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
  const root = path.join(ROOT, PACKAGE, 'src', dir);
  function walk(current: string, prefix: string): void {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(current, entry.name), path.join(prefix, entry.name));
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        out.push(path.join(prefix, entry.name));
      }
    }
  }
  walk(root, dir);
  return out;
}

const files = [
  ...sources('contracts'),
  ...sources('checks'),
  ...sources('registry'),
  'runner.ts',
  'index.ts',
];
assert.ok(files.length > 12, `Expected the contracts and the checks, found ${files.length}`);

/**
 * The only package doors this scan may reach. Both are layer-1 packages and neither knows the
 * application: the native-surface report asks `ota-core` what changed since the last store
 * release. Listed rather than pattern-matched, so a new dependency is a decision.
 */
const DECLARED_PACKAGE_DOORS = new Set(['@asol/ota-core/publishing']);

/**
 * Toolchain, not infrastructure.
 *
 * The rule this file enforces is that the package judging the repository stays
 * unentangled with it: no `@/`, no capability package internals, no SDK that
 * reaches a database, a bucket, or a device. A parser is none of those — it
 * grants access to nothing, and it is what lets a check follow a call through a
 * function reference instead of matching text, which the page-save gateway
 * needs because a page hands its writer to `save:` and the call sits elsewhere.
 *
 * Kept to an explicit set so a second entry is a decision, and deliberately not
 * modelled as an owned vendor in the capability registry: the refactor codemods
 * use the same parser, and claiming exclusivity over the language's own
 * compiler would be a category error.
 */
const TOOLCHAIN_MODULES = new Set(['typescript']);

for (const file of files) {
  const text = readFileSync(path.join(ROOT, PACKAGE, 'src', file), 'utf8');
  for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const specifier = match[1]!;
    if (specifier.startsWith('node:') || specifier === 'fs' || specifier === 'path' || specifier === 'child_process') continue;
    if (DECLARED_PACKAGE_DOORS.has(specifier)) continue;
    if (TOOLCHAIN_MODULES.has(specifier)) continue;
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

// ── Composition packages are not a feature-door bypass ────────────────────
// mayImportApp permits composition roots to reach the application, but only
// through declared feature doors. A deep alias — including `/index` as an
// undeclared alternate spelling of the `.` door — must be rejected.
{
  const probe = path.join(
    ROOT,
    'packages/notifications-composition/src/__architecture_feature_door_attack.ts',
  );
  const source = [
    "import type { Session } from '",
    '@/features/auth/domain/session.entity',
    "';\n",
    "import type { AuthDoor } from '",
    '@/features/auth/index',
    "';\n",
    'export type Attack = Session | AuthDoor;\n',
  ].join('');
  writeFileSync(probe, source);
  try {
    violations.length = 0;
    checkFeatureDoorContract();
    const messages = violations.map((v) => `${v.layer} ${v.violation} ${v.file}`);
    assert.ok(
      messages.some((message) => /auth\/domain\/session\.entity|Deep cross-feature import/i.test(message)),
      'Composition package deep feature import must fail.',
    );
    assert.ok(
      messages.some((message) => /auth\/index|Deep cross-feature import/i.test(message)),
      'Composition package /index alias must not bypass the declared feature door.',
    );
  } finally {
    rmSync(probe, { force: true });
  }
}

// ── Application feature registry claims are complete ───────────────────────
{
  violations.length = 0;
  checkApplicationFeatureRegistryContract();
  assert.equal(violations.length, 0, violations.map((v) => v.violation).join('\n'));
}

// ── Classification ─────────────────────────────────────────────────────────
assert.equal(classifyLayer('src/app/page.tsx'), 'application');
assert.equal(classifyLayer('src/features/foo/index.ts'), 'application');
assert.equal(classifyLayer('packages/data-core/src/index.ts'), 'capability');
assert.equal(classifyLayer('packages/orders-composition/src/index.ts'), 'composition');
assert.equal(classifyLayer('packages/architecture-core/src/index.ts'), 'enforcement');
assert.equal(classifyLayer('scripts/architecture-check.ts'), 'tooling');

// ── Labels are total ────────────────────────────────────────────────────────
for (const layer of ['application', 'capability', 'composition', 'enforcement', 'tooling'] as const) {
  assert.equal(typeof LAYER_LABELS[layer], 'string');
  assert.ok(LAYER_LABELS[layer].length > 0);
}

// ── Path normalization ──────────────────────────────────────────────────────
assert.equal(normalizePath('a\\b\\c'), 'a/b/c');
assert.equal(normalizePath('a/b/c'), 'a/b/c');

// ── Environment allowlist has no hidden copies ─────────────────────────────
assert.ok(ALLOWED_PROCESS_ENV_FILES.every((file) => !file.includes('node_modules')));

// ── Full architecture check ────────────────────────────────────────────────
violations.length = 0;
runArchitectureCheck();
assert.equal(violations.length, 0, violations.map((v) => `${v.layer}: ${v.violation} (${v.file})`).join('\n'));

console.log('architecture-core tests passed');
