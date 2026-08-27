import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  DEPLOY_ALL_PHASE_ORDER,
  SERVICE_PHASE_IDS,
  assertKnownBranchId,
  assertPreflightGraphInvariants,
  buildPreflightGraph,
  assertDeployAllStateIdentity,
  decideResumeSafety,
  decideCheckpointSkip,
  deploymentStateProvesPhase,
  failedBranchIds,
  hashContentPaths,
  hashDocumentationGateSources,
  hashSharedGateSources,
  isDeployAllPhaseId,
  newDeployAllState,
  neverCheckpointSkippableBranchIds,
  phasePrerequisites,
  phasesFrom,
  planFromBranch,
  planPreflightWaves,
  planRerunBranch,
  planRerunFailed,
  resumeFromBranchCommand,
  runbookBranchLocations,
  smallestRetryCommand,
  summarizeBranchError,
} from '../index';
import {
  BUILD_COMMAND_CATALOG,
  DEPLOY_ALL_PREFLIGHT_SECTIONS,
  assertBuildJobTransition,
  deployAllBranchIds,
} from '../console';

const PREFLIGHT_BRANCH_IDS = new Set(
  DEPLOY_ALL_PREFLIGHT_SECTIONS.flatMap((section) => section.branches.map((branch) => branch.id)),
);
import {
  allAndroidReleaseBranchIds,
  androidRunbookStatsByTab,
  ANDROID_RELEASE_RUNBOOKS,
} from '../console/android-release-runbook';

const ROOT = process.cwd();

// ── Door ────────────────────────────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'packages/release-core/package.json'), 'utf8')) as {
  exports: Record<string, unknown>;
};
assert.deepEqual(
  Object.keys(manifest.exports),
  [
    '.',
    './console',
    './console-server',
    './console-artifacts',
    './console/android-release-runbook',
  ],
  'Five load-time contracts: pipeline, browser vocabulary, process runner, artifact tools, and the Android release runbook.',
);

assert.ok(BUILD_COMMAND_CATALOG.length > 0, 'The console command catalog must not become empty.');
assert.doesNotThrow(() => assertBuildJobTransition('queued', 'running'));
for (const file of [
  'console/build-command-catalog.ts',
  'console/build-job-progress.ts',
  'console/build-job-types.ts',
  'console/bundle-analysis-types.ts',
  'console/android-release-runbook.ts',
  'console.ts',
]) {
  const text = readFileSync(path.join(ROOT, 'packages/release-core/src', file), 'utf8');
  assert.doesNotMatch(text, /(?:node:|server-only|@\/)/, `${file} must stay browser-safe.`);
}

for (const file of [
  'console-server/build-job-runner.ts',
  'console-server/build-job-artifacts.ts',
  'console-server/bundle-analyzer.ts',
  'console-server.ts',
  'console-artifacts.ts',
]) {
  const text = readFileSync(path.join(ROOT, 'packages/release-core/src', file), 'utf8');
  assert.doesNotMatch(text, /@\//, `${file} must receive application services through a port.`);
}
assert.match(
  readFileSync(path.join(ROOT, 'packages/release-core/src/console-server/build-job-runner.ts'), 'utf8'),
  /releaseConsolePortsNotConfigured/,
  'The release runner must fail closed before the application seam is registered.',
);
const buildJobRunnerSource = readFileSync(
  path.join(ROOT, 'packages/release-core/src/console-server/build-job-runner.ts'),
  'utf8',
);
assert.match(
  buildJobRunnerSource,
  /if \(shippingPlatforms\.ios\.storeDistribution\)/,
  'The dev release page must not query App Store Connect when iOS store distribution is explicitly not live.',
);

const runbookStats = androidRunbookStatsByTab();
for (const pathId of Object.keys(ANDROID_RELEASE_RUNBOOKS)) {
  const stats = runbookStats[pathId as keyof typeof runbookStats];
  assert.ok(stats.phases >= 3, `${pathId} must declare at least three runbook phases`);
  assert.ok(stats.branches >= 18, `${pathId} must expose a granular command tree`);
  assert.equal(
    stats.branches,
    branchIdsFromRunbook(ANDROID_RELEASE_RUNBOOKS[pathId as keyof typeof ANDROID_RELEASE_RUNBOOKS]).length,
  );
}
assert.equal(new Set(allAndroidReleaseBranchIds()).size, allAndroidReleaseBranchIds().length);

function branchIdsFromRunbook(
  runbook: readonly { sections: readonly { branches: readonly { id: string }[] }[] }[],
): string[] {
  return runbook.flatMap((phase) =>
    phase.sections.flatMap((section) => section.branches.map((branch) => branch.id)),
  );
}

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
for (const file of [
  'pipeline/phases.ts',
  'pipeline/state.ts',
  'pipeline/run-deployment-npm-script.ts',
  'pipeline/push-main-branch.ts',
  'pipeline/input-hash.ts',
  'pipeline/error-summary.ts',
  'pipeline/branch-checkpoints.ts',
  'pipeline/branch-resume.ts',
  'pipeline/preflight-graph.ts',
  'index.ts',
]) {
  const text = readFileSync(path.join(ROOT, 'packages/release-core/src', file), 'utf8');
  for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const specifier = match[1]!;
    if (specifier.startsWith('node:') || specifier.startsWith('.')) continue;
    assert.ok(DECLARED_DOORS.has(specifier), `${file} imports undeclared ${specifier}.`);
  }
  assert.ok(!text.includes('@/'), `${file} must not know the application.`);
}


// ── Branch-level resume resolves against the runbook ────────────────────────
//
// A branch id is the smallest thing an operator can name, so these plans are
// what stands between "one command failed" and "run the whole phase again".
const branchLocations = runbookBranchLocations();
assert.ok(branchLocations.length > 0, 'The runbook must expose branch locations.');
assert.deepEqual(
  branchLocations.map((item) => item.branchId),
  deployAllBranchIds(),
  'Branch locations must cover the runbook in execution order.',
);
assert.throws(() => assertKnownBranchId('not-a-branch'), /Unknown runbook branch id/);

const fromServiceSmoke = planFromBranch('service-smoke');
assert.equal(fromServiceSmoke.fromPhase, 'preflight');
assert.ok(
  fromServiceSmoke.selectedBranches.has('service-smoke') &&
    fromServiceSmoke.selectedBranches.has('push-main') &&
    fromServiceSmoke.selectedBranches.has('deployed-smoke'),
  'Resuming at a branch must still run everything the runbook lists after it.',
);
assert.ok(
  !fromServiceSmoke.selectedBranches.has('lint'),
  'Resuming at a branch must not re-run the branches before it.',
);

const rerunLint = planRerunBranch('lint');
assert.equal(rerunLint.onlyPhase, 'preflight');
assert.deepEqual([...rerunLint.selectedBranches], ['lint'], 'A branch re-run runs exactly one branch.');

// The earliest failure is the one worth restarting from: a later one is often
// its consequence.
const rerunFailed = planRerunFailed(['deployed-smoke', 'types', 'service-builds']);
assert.equal(rerunFailed.fromPhase, 'preflight');
assert.ok(rerunFailed.selectedBranches.has('types'));
assert.ok(!rerunFailed.selectedBranches.has('lint'), 'Re-running failures starts at the smallest failed branch.');
assert.throws(() => planRerunFailed([]), /No failed branch is recorded/);
assert.equal(smallestRetryCommand('lint'), 'npm run deploy:all -- --rerun-branch=lint');
assert.equal(resumeFromBranchCommand('lint'), 'npm run deploy:all -- --from-branch=lint');

// Branch precision is safe only while the active source identity is unchanged.
const revisionA = 'a'.repeat(40);
const revisionB = 'b'.repeat(40);
const fingerprintA = '1'.repeat(64);
const fingerprintB = '2'.repeat(64);
const completedOnA = {
  ...newDeployAllState({ revision: revisionA, sourceFingerprint: fingerprintA }),
  completedPhases: ['preflight'],
};
assert.deepEqual(
  decideResumeSafety({
    resumeRequested: true,
    currentRevision: revisionA,
    currentSourceFingerprint: fingerprintA,
    state: completedOnA,
  }),
  { forceFullValidation: false },
  'Same-revision resume keeps its precise branch plan.',
);
assert.equal(
  decideResumeSafety({
    resumeRequested: true,
    currentRevision: revisionB,
    currentSourceFingerprint: fingerprintA,
    state: completedOnA,
  }).forceFullValidation,
  true,
  'A new HEAD must expand branch resume back to full validation.',
);
assert.equal(
  decideResumeSafety({
    resumeRequested: true,
    currentRevision: revisionA,
    currentSourceFingerprint: fingerprintB,
    state: completedOnA,
  }).forceFullValidation,
  true,
  'Changed inputs on the same HEAD must expand branch resume back to full validation.',
);
assert.throws(
  () =>
    assertDeployAllStateIdentity(
      completedOnA,
      { revision: revisionB, sourceFingerprint: fingerprintA },
      'Publish',
    ),
  /cannot use deploy proof from another source identity/,
  'SHA-A completed phases cannot authorize SHA-B publish prerequisites.',
);
assert.equal(
  deploymentStateProvesPhase(completedOnA, 'preflight', revisionB, fingerprintA),
  false,
  'Completed phases are not proof across revisions.',
);
assert.equal(
  deploymentStateProvesPhase(completedOnA, 'preflight', revisionA, fingerprintB),
  false,
  'Completed phases are not proof across input fingerprints.',
);
assert.equal(
  deploymentStateProvesPhase(completedOnA, 'preflight', revisionA, fingerprintA),
  true,
  'Same-source completed phase proof remains valid.',
);

// ── Checkpoints may replace a verification, never an effect ─────────────────
const sampleCheckpoint = {
  branchId: 'lint',
  phase: 'preflight',
  command: 'lint',
  status: 'success',
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '2026-01-01T00:01:00.000Z',
  revision: 'a'.repeat(40),
  inputHash: 'b'.repeat(64),
} as const;

assert.equal(
  decideCheckpointSkip({
    branchId: 'lint',
    phaseId: 'preflight',
    revision: sampleCheckpoint.revision,
    inputHash: sampleCheckpoint.inputHash,
    checkpoints: [sampleCheckpoint],
  }).skip,
  true,
  'A matching preflight checkpoint may be reused.',
);
assert.equal(
  decideCheckpointSkip({
    branchId: 'lint',
    phaseId: 'preflight',
    revision: 'c'.repeat(40),
    inputHash: sampleCheckpoint.inputHash,
    checkpoints: [sampleCheckpoint],
  }).skip,
  false,
  'A different commit SHA must never reuse a checkpoint.',
);
assert.equal(
  decideCheckpointSkip({
    branchId: 'lint',
    phaseId: 'preflight',
    revision: sampleCheckpoint.revision,
    inputHash: 'd'.repeat(64),
    checkpoints: [sampleCheckpoint],
  }).skip,
  false,
  'A different input hash must never reuse a checkpoint.',
);
assert.equal(
  decideCheckpointSkip({
    branchId: 'lint',
    phaseId: 'preflight',
    revision: sampleCheckpoint.revision,
    inputHash: sampleCheckpoint.inputHash,
    checkpoints: [{ ...sampleCheckpoint, status: 'failed', errorSummary: 'x' }],
  }).skip,
  false,
  'A recorded failure is never a skip.',
);
assert.equal(
  decideCheckpointSkip({
    branchId: 'lint',
    phaseId: 'preflight',
    revision: sampleCheckpoint.revision,
    inputHash: sampleCheckpoint.inputHash,
    checkpoints: [],
  }).skip,
  false,
  'No checkpoint means run it.',
);

// Publish, git, secrets, remote deploys and production verification are effects.
// No checkpoint may stand in for one.
const neverSkippable = neverCheckpointSkippableBranchIds();
for (const branchId of [
  'secrets-backup',
  'stage-tree',
  'commit-tree',
  'push-main',
  'notifications-deploy-command',
  'sub2main-deploy-command',
  'main-ready',
  'main-serving',
  'deployed-smoke',
]) {
  assert.ok(neverSkippable.includes(branchId), `${branchId} must never be checkpoint-skippable.`);
  const location = branchLocations.find((item) => item.branchId === branchId)!;
  assert.equal(
    decideCheckpointSkip({
      branchId,
      phaseId: location.phaseId,
      revision: sampleCheckpoint.revision,
      inputHash: sampleCheckpoint.inputHash,
      checkpoints: [{ ...sampleCheckpoint, branchId, phase: location.phaseId }],
    }).skip,
    false,
    `${branchId} must not be skipped by a checkpoint, even a matching one.`,
  );
}
for (const branchId of ['lint', 'types', 'server-build', 'service-smoke']) {
  assert.ok(!neverSkippable.includes(branchId), `${branchId} is a preflight verification and may be reused.`);
}

// Only the deployment state, at the same revision, can answer for an effect.
const provenState = {
  schemaVersion: 2 as const,
  revision: sampleCheckpoint.revision,
  sourceFingerprint: sampleCheckpoint.inputHash,
  runId: 'run',
  timestamp: '2026-01-01T00:00:00.000Z',
  mainComment: 'deploy(main)',
  skipPreflight: false,
  completedPhases: ['preflight', 'publish'],
  lastUpdated: '2026-01-01T00:00:00.000Z',
};
assert.equal(deploymentStateProvesPhase(provenState, 'publish', sampleCheckpoint.revision, sampleCheckpoint.inputHash), true);
assert.equal(deploymentStateProvesPhase(provenState, 'publish', 'e'.repeat(40), sampleCheckpoint.inputHash), false, 'A different revision proves nothing.');
assert.equal(deploymentStateProvesPhase(provenState, 'main', sampleCheckpoint.revision, sampleCheckpoint.inputHash), false);
assert.equal(deploymentStateProvesPhase(undefined, 'publish', sampleCheckpoint.revision, sampleCheckpoint.inputHash), false);

assert.deepEqual(
  failedBranchIds([
    { ...sampleCheckpoint, branchId: 'types', status: 'failed', errorSummary: 'x' },
    { ...sampleCheckpoint, branchId: 'lint', status: 'failed', errorSummary: 'x' },
  ]),
  ['lint', 'types'],
  'Failed branches are reported in runbook order, not in write order.',
);

// ── Checkpoints must not carry secrets ─────────────────────────────────────
process.env.ASOL_TEST_DEPLOY_TOKEN = 'super-secret-token-value';
const summary = summarizeBranchError(
  new Error(
    'vercel deploy failed: token=super-secret-token-value Authorization: Bearer abcdefghijklmnop0123456789\nsecond line',
  ),
);
assert.ok(!summary.includes('super-secret-token-value'), 'A secret env value must never reach a checkpoint.');
assert.ok(!summary.includes('abcdefghijklmnop0123456789'), 'A bearer credential must never reach a checkpoint.');
assert.ok(!summary.includes('second line'), 'Only the first line of a failure is stored.');
assert.ok(summary.length <= 240, 'A stored summary stays bounded.');
delete process.env.ASOL_TEST_DEPLOY_TOKEN;

// Documentation-sensitive gates must not reuse stale checkpoints after a docs-only edit.
const hashSandbox = mkdtempSync(path.join(tmpdir(), 'asol-release-core-hash-'));
try {
  mkdirSync(path.join(hashSandbox, 'src'), { recursive: true });
  mkdirSync(path.join(hashSandbox, 'docs'), { recursive: true });
  mkdirSync(path.join(hashSandbox, 'config'), { recursive: true });
  writeFileSync(path.join(hashSandbox, 'src', 'app.ts'), 'export const app = true;\n', 'utf8');
  writeFileSync(path.join(hashSandbox, 'docs', 'guide.md'), '# One\n', 'utf8');
  const sharedBefore = hashSharedGateSources(hashSandbox);
  const docsBefore = hashDocumentationGateSources(hashSandbox);
  writeFileSync(path.join(hashSandbox, 'config', 'secret-archive-latest.zip.enc'), 'rotated\n', 'utf8');
  assert.equal(
    hashDocumentationGateSources(hashSandbox),
    docsBefore,
    'The modeled publish-time secret archive output does not invalidate validated source identity.',
  );
  writeFileSync(path.join(hashSandbox, 'docs', 'guide.md'), '# Two\n', 'utf8');
  assert.equal(
    hashSharedGateSources(hashSandbox),
    sharedBefore,
    'A docs-only edit does not invalidate runtime-only preflight checkpoints.',
  );
  assert.notEqual(
    hashDocumentationGateSources(hashSandbox),
    docsBefore,
    'A docs-only edit must invalidate docs:generate and architecture checkpoints.',
  );
} finally {
  rmSync(hashSandbox, { recursive: true, force: true });
}

// ── The preflight graph keeps the ordering that matters ────────────────────
const graph = buildPreflightGraph();
assert.doesNotThrow(() => assertPreflightGraphInvariants(graph), 'Declared preflight ordering must hold.');
assert.equal(graph.length, deployAllBranchIds().filter((id) => PREFLIGHT_BRANCH_IDS.has(id)).length);

// A branch nobody classified runs alone. Forgetting costs time, never safety.
assert.throws(
  () =>
    assertPreflightGraphInvariants([
      ...graph.filter((node) => node.id !== 'service-smoke'),
      { id: 'service-smoke', command: 'smoke:services', sectionId: 'service-builds', dependsOn: [], concurrency: 'exclusive', failFast: true },
    ]),
  /must run after "service-builds"/,
  'Dropping a required edge must fail loudly.',
);

const waves = planPreflightWaves(graph);
const orderOf = (branchId: string): number => waves.findIndex((wave) => wave.nodes.some((node) => node.id === branchId));
for (const [after, before] of [
  ['architecture', 'knowledge'],
  ['service-mirror-verify', 'service-mirror-sync'],
  ['service-builds', 'service-mirror-sync'],
  ['service-smoke', 'service-builds'],
  ['smoke', 'server-build'],
  ['static-build', 'server-build'],
  ['function-size', 'server-build'],
] as const) {
  assert.ok(orderOf(after) > orderOf(before), `${after} must be scheduled after ${before}.`);
}
for (const wave of waves) {
  if (wave.mode === 'exclusive') {
    assert.equal(wave.nodes.length, 1, 'An exclusive branch never shares a wave.');
    assert.ok(wave.nodes[0]!.failFast, 'An exclusive branch stops the run when it fails.');
    continue;
  }
  for (const node of wave.nodes) {
    assert.equal(node.concurrency, 'parallel', 'Only parallel branches share a wave.');
  }
}
assert.ok(
  waves.some((wave) => wave.mode === 'parallel' && wave.nodes.length > 1),
  'Independent quality checks must actually run concurrently.',
);
assert.deepEqual(
  planPreflightWaves(graph, new Set(['lint'])).map((wave) => wave.nodes.map((node) => node.id)),
  [['lint']],
  'A single-branch re-run plans exactly that branch.',
);

// ── Input hashes are content-addressed and stable ──────────────────────────
const hashOnce = hashContentPaths({ root: ROOT, includePaths: ['packages/release-core/src/pipeline'] });
const hashTwice = hashContentPaths({ root: ROOT, includePaths: ['packages/release-core/src/pipeline'] });
assert.equal(hashOnce, hashTwice, 'The same tree must hash to the same value.');
assert.notEqual(
  hashOnce,
  hashContentPaths({ root: ROOT, includePaths: ['packages/release-core/src/console'] }),
  'Different content must hash differently.',
);
assert.match(hashOnce, /^[0-9a-f]{64}$/, 'Hashes are hex digests with nothing else in them.');

console.log(
  `@asol/release-core contract: 4 doors, ${DEPLOY_ALL_PHASE_ORDER.length} phases and console boundaries pinned.`,
);
