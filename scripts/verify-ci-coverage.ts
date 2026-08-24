/**
 * CI gate coverage.
 *
 * CI no longer owns a handwritten copy of every package test. The required `verify` job runs the
 * generated `test` gate, and this contract proves that the generated gate contains every sealed
 * package test plus the clean-checkout prerequisites that CI needs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { readPackageScripts, resolveGeneratedGate } from './generated-gates';

const ROOT = process.cwd();
const WORKFLOW = path.join(ROOT, '.github/workflows/native-core.yml');
const workflow = readFileSync(WORKFLOW, 'utf8');
const scripts = readPackageScripts();

// The job id `verify` is the required status check named by branch protection.
assert.match(
  workflow,
  /^ {2}verify:$/m,
  'The job id `verify` is the required branch-protection status check.',
);
assert.ok(
  !/^ {4}name:/m.test(workflow.slice(workflow.indexOf('  verify:'))),
  'The `verify` job must not declare its own name; the check-run name must remain `verify`.',
);
const protection = readFileSync(path.join(ROOT, 'scripts/protect-main-branch.ts'), 'utf8');
assert.ok(protection.includes("'verify'"), 'Branch protection no longer requires the `verify` check.');

const generatedTest = resolveGeneratedGate('test', scripts);
const testScripts = new Set(
  generatedTest.filter((step) => step.kind === 'npm-script').map((step) => step.value),
);
const packageGates = Object.keys(scripts).filter((name) => /^test:.*-core$/.test(name));
assert.ok(packageGates.length >= 15, `Expected the full package gate set, found ${packageGates.length}.`);
assert.deepEqual(
  packageGates.filter((gate) => !testScripts.has(gate)),
  [],
  'Every test:*-core script must be generated into the required CI test gate.',
);

for (const required of ['services:sync', 'test:compositions']) {
  assert.ok(testScripts.has(required), `Generated test gate must contain ${required}.`);
}

// The workflow consumes the generated gate rather than enumerating package tests itself.
assert.ok(workflow.includes('npm test'), 'CI must execute the generated test gate with npm test.');
assert.ok(
  workflow.includes('npm run architecture:check'),
  'CI must enforce architecture before accepting the generated test gate.',
);
for (const script of ['services:verify', 'services:build']) {
  assert.ok(workflow.includes(`npm run ${script}`), `CI must run ${script} on clean service mirrors.`);
}
assert.ok(
  workflow.indexOf('npm test') < workflow.indexOf('npm run services:verify'),
  'The generated test gate writes service mirrors before services:verify reads them.',
);
assert.ok(
  workflow.indexOf('npm run services:verify') < workflow.indexOf('npm run services:build'),
  'Service mirrors must be verified before Vercel-shaped service builds run.',
);

console.log(
  `[ci:coverage] verify job consumes the generated test gate; ${packageGates.length} package gates are auto-covered.`,
);
