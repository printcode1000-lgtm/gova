import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  DEPLOY_ALL_PHASE_ORDER,
  SERVICE_PHASE_IDS,
  isDeployAllPhaseId,
  phasePrerequisites,
  phasesFrom,
} from '../index';

const ROOT = process.cwd();

// ── Door ────────────────────────────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'packages/release-core/package.json'), 'utf8')) as {
  exports: Record<string, unknown>;
};
assert.deepEqual(Object.keys(manifest.exports), ['.'], 'One door.');

// ── Phase order is the release ──────────────────────────────────────────────
//
// Pinned literally. Every other property below is derived from this array, so a reordering that
// looked harmless — publishing before preflight, deploying main before the services it calls —
// would still satisfy the derived checks. This is the one place the order itself is asserted.
assert.deepEqual(
  [...DEPLOY_ALL_PHASE_ORDER],
  [
    'preflight',
    'publish',
    'notifications',
    'products',
    'orders',
    'profiles',
    'submain',
    'sub2main',
    'main',
  ],
  'The release order changed. Main deploys last because the services it calls must exist first, ' +
    'and preflight runs first because everything after it is irreversible.',
);

for (const service of SERVICE_PHASE_IDS) {
  assert.ok(
    DEPLOY_ALL_PHASE_ORDER.includes(service),
    `${service} is a service phase that the run never reaches.`,
  );
  assert.ok(
    DEPLOY_ALL_PHASE_ORDER.indexOf(service) < DEPLOY_ALL_PHASE_ORDER.indexOf('main'),
    `${service} must deploy before main, which routes browsers to it.`,
  );
  assert.ok(
    DEPLOY_ALL_PHASE_ORDER.indexOf('preflight') < DEPLOY_ALL_PHASE_ORDER.indexOf(service),
    'Nothing deploys before preflight.',
  );
}

assert.equal(isDeployAllPhaseId('main'), true);
assert.equal(isDeployAllPhaseId('nonsense'), false, 'An unknown --phase must not resume anything.');

assert.deepEqual(phasesFrom('sub2main'), ['sub2main', 'main'], 'Resuming runs the rest, in order.');
assert.deepEqual(phasesFrom('preflight'), [...DEPLOY_ALL_PHASE_ORDER]);
assert.deepEqual(phasePrerequisites('preflight'), [], 'The first phase depends on nothing.');
assert.deepEqual(
  phasePrerequisites('main'),
  DEPLOY_ALL_PHASE_ORDER.slice(0, -1),
  'Main depends on every phase before it — that is what makes a partial run resumable.',
);

// ── The pipeline stays out of the CLI ───────────────────────────────────────
for (const cli of ['scripts/deploy-all.ts', 'scripts/deploy-push.ts']) {
  const text = readFileSync(path.join(ROOT, cli), 'utf8');
  assert.ok(text.includes('@asol/release-core'), `${cli} must use the package.`);
  assert.ok(
    !/\.\/lib\//.test(text),
    `${cli} still imports from scripts/lib, which no longer exists as a second home for this.`,
  );
}

// The shim that only re-exported the deploy engine's door is gone; a second name for one door is
// how a package seal becomes decorative.
assert.throws(
  () => readFileSync(path.join(ROOT, 'scripts/lib/vercel-deployment-monitor.ts'), 'utf8'),
  /ENOENT/,
  'scripts/lib/vercel-deployment-monitor.ts must stay deleted — import @asol/vercel-deploy-core.',
);

// ── It must not reach the application ───────────────────────────────────────
const DECLARED_DOORS = new Set(['@asol/vercel-deploy-core']);
for (const file of ['pipeline/phases.ts', 'pipeline/state.ts', 'pipeline/run-deployment-npm-script.ts', 'pipeline/push-main-branch.ts', 'index.ts']) {
  const text = readFileSync(path.join(ROOT, 'packages/release-core/src', file), 'utf8');
  for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const specifier = match[1]!;
    if (specifier.startsWith('node:') || specifier.startsWith('.')) continue;
    assert.ok(DECLARED_DOORS.has(specifier), `${file} imports undeclared ${specifier}.`);
  }
  assert.ok(!text.includes('@/'), `${file} must not know the application.`);
}

console.log(
  `@asol/release-core contract: 1 door, ${DEPLOY_ALL_PHASE_ORDER.length} phases pinned in order.`,
);
