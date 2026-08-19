/**
 * CI gate coverage.
 *
 * `scripts/tests/pipeline-coverage.test.ts` already asserts that every `test:*-core` script is
 * in the `build`, `build:static`, and `test` chains — rule 3. That guards the *local* release
 * path. It says nothing about CI, and CI is what branch protection actually requires: the
 * `verify` job is the reviewer on a single-developer repository.
 *
 * The workflow's gate list is a hand-maintained copy of package.json, so it drifts. It had:
 * seven sealed packages — auth, catalog, product, product-style, dev, system-logs, map — were
 * never run there, and a broken one would have merged green. This closes that by making the copy
 * checked rather than trusted.
 *
 * It also pins the two names that must not change silently: the job id `verify`, which is the
 * required status check, and the steps that keep a clean checkout honest.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WORKFLOW = path.join(ROOT, '.github/workflows/native-core.yml');

const workflow = readFileSync(WORKFLOW, 'utf8');
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

// ── The required status check's name ────────────────────────────────────────
//
// GitHub reports the check run under the job's name, falling back to the job id. Branch
// protection in scripts/protect-main-branch.ts requires `verify`. A rename here would leave a
// required check that never reports, which blocks every merge permanently — a worse failure than
// no protection at all.
assert.match(
  workflow,
  /^ {2}verify:$/m,
  'The job id `verify` is the required status check named in scripts/protect-main-branch.ts. ' +
    'Renaming it blocks every merge permanently. Rename the file or the workflow instead.',
);
assert.ok(
  !/^ {4}name:/m.test(workflow.slice(workflow.indexOf('  verify:'))),
  'The `verify` job must not declare its own `name:` — that becomes the check-run name and would ' +
    'no longer match the required status check.',
);

const protection = readFileSync(path.join(ROOT, 'scripts/protect-main-branch.ts'), 'utf8');
assert.ok(
  protection.includes("'verify'"),
  'Branch protection no longer requires the `verify` check, so nothing gates a merge.',
);

// ── Every package gate runs in CI ───────────────────────────────────────────
const packageGates = Object.keys(manifest.scripts).filter((name) => /^test:.*-core$/.test(name));
assert.ok(packageGates.length >= 15, `Expected the full set of package gates, found ${packageGates.length}`);

const missing = packageGates.filter((gate) => !workflow.includes(`npm run ${gate}`));
assert.deepEqual(
  missing,
  [],
  `These package gates never run in CI: ${missing.join(', ')}. A sealed package whose contract ` +
    'test does not run on the required check is guarded by nothing on the path that actually ' +
    'gates a merge.',
);

// ── The steps a clean checkout depends on ───────────────────────────────────
//
// Each of these exists because something passed locally and failed on CI. Losing one restores a
// failure this repository has already paid for.
const REQUIRED_STEPS: ReadonlyArray<{ script: string; because: string }> = [
  {
    script: 'services:sync',
    because:
      'services/*/generated is git-ignored, so a clean checkout has no mirrors and the contract ' +
      'tests that assert a non-empty mirror fail on every push',
  },
  {
    script: 'services:verify',
    because:
      'a specifier the mirror walker cannot see is never copied, and the remote build still ' +
      'succeeds — the failure lands on the first request instead',
  },
  {
    script: 'services:build',
    because:
      'each service is uploaded alone and installed against its own package.json; nothing else ' +
      'builds one the way Vercel does',
  },
  { script: 'architecture:check', because: 'it is what enforces rules 2, 5 and 7 mechanically' },
  { script: 'test:compositions', because: 'the per-account capability closure is asserted there' },
];

for (const step of REQUIRED_STEPS) {
  assert.ok(
    workflow.includes(`npm run ${step.script}`),
    `CI no longer runs "${step.script}": ${step.because}.`,
  );
}

// ── Order matters for exactly one pair ──────────────────────────────────────
assert.ok(
  workflow.indexOf('npm run services:sync') < workflow.indexOf('npm run services:verify'),
  'services:verify reads the mirror, so it must run after services:sync writes it.',
);
assert.ok(
  workflow.indexOf('npm run services:verify') < workflow.indexOf('npm run services:build'),
  'Verifying the upload before building it reports a missing module as a missing module, rather ' +
    'than as whatever the bundler says about it.',
);

console.log(
  `[ci:coverage] verify job intact, ${packageGates.length} package gates run in CI, ` +
    `${REQUIRED_STEPS.length} clean-checkout steps present.`,
);
