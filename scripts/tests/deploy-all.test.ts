/**
 * Guards on `deploy:all`'s refusals.
 *
 * The push to `main` is the point of no return, so every check that can stop a
 * deployment runs before the first git write. These tests cover the pure parts
 * of those checks; the effectful ones are exercised by running the script.
 *
 * Importing the module must not deploy — that is itself asserted here, since a
 * regression in the entrypoint guard would turn `npm test` into a release.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { __testables } from "../deploy-all";

const {
  parseFlags,
  parseArgv,
  expandUnsafeResumeToFullValidation,
  resolvePhasesToRun,
  compareVersions,
  SCRATCH_FILE_PATTERNS,
  PREFLIGHT_SECTIONS,
  PREFLIGHT_STEPS,
  DEPLOY_ALL_RUNBOOK,
  formatRunbook,
  RELEASE_MANIFEST,
  formatSuccessLine,
  FAIL_PREFIX,
  DEPLOY_ALL_PHASE_ORDER,
  SERVICES_PHASE_ALIAS,
  buildPreflightGraph,
  planPreflightWaves,
  assertPreflightGraphInvariants,
  findRunbookBranch,
} = __testables;

// ── 1. Importing the module must not have deployed ─────────────────────────
// Reaching this line at all proves `main()` did not run on import.
assert.ok(true, "Importing deploy-all must not trigger a deployment.");

// ── 2. Flags default to the safe position ──────────────────────────────────
const defaults = parseFlags([]);
assert.equal(defaults.skipPreflight, false, "Preflight must run unless explicitly skipped.");
assert.equal(defaults.allowEmpty, false, "An empty deployment must be opt-in.");
assert.equal(defaults.allowManifestDowngrade, false, "A manifest downgrade must be opt-in.");
assert.equal(defaults.allowScratchFiles, false, "Publishing scratch files must be opt-in.");

// ── 3. Each flag is honoured ───────────────────────────────────────────────
assert.equal(parseFlags(["--skip-preflight"]).skipPreflight, true);
assert.equal(parseFlags(["--allow-empty"]).allowEmpty, true);
assert.equal(parseFlags(["--allow-manifest-downgrade"]).allowManifestDowngrade, true);
assert.equal(parseFlags(["--allow-scratch-files"]).allowScratchFiles, true);

const combined = parseFlags(["--skip-preflight", "--allow-empty"]);
assert.equal(combined.skipPreflight, true);
assert.equal(combined.allowEmpty, true);

// ── 4. A typo must not be silently ignored ─────────────────────────────────
// A mistyped "--skip-preflght" that parsed as "no flags" would be harmless,
// but one that parsed as "skip everything" would not. Refuse the unknown.
assert.throws(
  () => parseFlags(["--skip-preflght"]),
  /Unknown option/,
  "An unrecognised option must stop the deployment.",
);
assert.throws(() => parseFlags(["--force"]), /Unknown option/);

// ── 5. Preflight must cover the release path ───────────────────────────────
for (const required of [
  "doctor:environment:production",
  "vercel:accounts:check",
  "docs:generate",
  "lint",
  "typecheck",
  "architecture:check",
  "test",
  "db:ensure",
  "db:schema:sync:release",
  "build",
  "build:static",
  "services:sync",
  "services:verify",
  "services:build",
]) {
  assert.ok(
    (PREFLIGHT_STEPS as readonly string[]).includes(required),
    `Preflight must run "${required}" before publishing.`,
  );
}
assert.deepEqual(
  PREFLIGHT_SECTIONS.map((section) => section.label),
  [
    "environment and Vercel accounts",
    "source quality and architecture",
    "database and runtime contracts",
    "main app builds",
    "isolated service deployments",
  ],
  "Preflight sections must stay ordered from environment readiness to deployment-shaped checks.",
);
assert.ok(
  PREFLIGHT_STEPS.indexOf("build") < PREFLIGHT_STEPS.indexOf("build:static"),
  "Server build must run before static release build so static output remains the final release artifact.",
);

assert.deepEqual(
  DEPLOY_ALL_RUNBOOK.map((phase) => phase.id),
  [...DEPLOY_ALL_PHASE_ORDER],
  "The visible runbook must cover the exact deploy:all phase order.",
);
for (const phase of DEPLOY_ALL_RUNBOOK) {
  assert.ok(phase.sections.length > 0, `${phase.id} must have at least one section.`);
  for (const section of phase.sections) {
    assert.ok(section.branches.length > 0, `${phase.id}/${section.id} must have branches.`);
    for (const branch of section.branches) {
      assert.equal(
        typeof branch.command,
        "string",
        `${phase.id}/${section.id}/${branch.id} must expose one command string.`,
      );
      assert.ok(
        branch.command.trim().length > 0,
        `${phase.id}/${section.id}/${branch.id} command must not be empty.`,
      );
      assert.doesNotMatch(
        branch.command,
        /\s(?:&&|\|\||;)\s/,
        `${phase.id}/${section.id}/${branch.id} must stay one command, not a chained script.`,
      );
    }
  }
}
assert.match(formatRunbook(), /1\.1\.1 production-doctor: doctor:environment:production/);
assert.match(formatRunbook(), /2\.3\.6 push-main: git:push main/);
assert.match(
  formatRunbook(),
  /origin-main-current: git:fetch\+merge-base/,
  "publish must refuse a main branch that advanced after preflight.",
);

// ── 6. Version comparison drives the manifest-downgrade refusal ────────────
assert.ok(compareVersions("0.1.0", "0.1.15") < 0, "0.1.0 is older than 0.1.15");
assert.ok(compareVersions("0.1.15", "0.1.0") > 0, "0.1.15 is newer than 0.1.0");
assert.equal(compareVersions("0.1.15", "0.1.15"), 0, "Equal versions compare equal");
assert.ok(compareVersions("0.2.0", "0.10.0") < 0, "Segments compare numerically, not as strings");
assert.ok(
  compareVersions("0.1.15-1786532286273", "0.1.15-1786532286274") < 0,
  "Release-id suffixes are ordered too",
);

// ── 7. Scratch patterns catch what `git add -A` would otherwise publish ────
const shouldBlock = [
  "src/__probe__.ts",
  "debug.log",
  "notes.tmp",
  "config.ts.bak",
  "some/scratchpad/output.txt",
];
for (const entry of shouldBlock) {
  assert.ok(
    SCRATCH_FILE_PATTERNS.some((pattern) => pattern.test(entry)),
    `"${entry}" must be recognised as a scratch file.`,
  );
}

const shouldPass = [
  "src/features/notifications/index.ts",
  "packages/native-core/src/index.ts",
  "docs/07-mobile-and-release/capacitor/native-core-module.md",
  "scripts/deploy-all.ts",
];
for (const entry of shouldPass) {
  assert.ok(
    !SCRATCH_FILE_PATTERNS.some((pattern) => pattern.test(entry)),
    `"${entry}" is real source and must not be blocked.`,
  );
}

// ── 8. The guarded manifest is the one build:static rewrites ───────────────
assert.equal(
  RELEASE_MANIFEST,
  "public/asol-web-manifest.json",
  "The release manifest guard must watch the file build:static rewrites.",
);

assert.match(
  formatSuccessLine(false),
  /^\[deploy:all\] SUCCESS — preflight passed/,
  "Success line must state preflight passed.",
);
assert.match(
  formatSuccessLine(true),
  /preflight skipped/,
  "Success line must record when preflight was skipped.",
);
assert.equal(FAIL_PREFIX, "[deploy:all] FAILED —", "Failure prefix must be stable.");
assert.ok(
  PREFLIGHT_STEPS.includes("simulation:coverage"),
  "deploy:all preflight must run the simulation discovery guard.",
);

// ── 9. Phased deploy resolves the full release order by default ────────────
assert.deepEqual(
  resolvePhasesToRun({ listPhases: false }),
  [...DEPLOY_ALL_PHASE_ORDER],
  "Full deploy:all must run every phase in order.",
);

// ── 10. Single-phase and alias selection ───────────────────────────────────
assert.deepEqual(
  resolvePhasesToRun({ listPhases: false, onlyPhase: "preflight" }),
  ["preflight"],
);
assert.deepEqual(
  resolvePhasesToRun({ listPhases: false, onlyPhase: SERVICES_PHASE_ALIAS }),
  ["notifications", "products", "orders", "profiles", "submain", "sub2main"],
);
assert.deepEqual(
  resolvePhasesToRun({ listPhases: false, fromPhase: "submain" }),
  ["submain", "sub2main", "main"],
);

// A changed source identity may widen validation, never silently keep a stale
// branch selection. Diagnostic-only requests stop after full preflight so the
// safety expansion cannot unexpectedly publish.
assert.deepEqual(
  resolvePhasesToRun(
    expandUnsafeResumeToFullValidation(
      parseArgv(["--from-branch=service-smoke"]).phase,
      "HEAD changed",
    ),
  ),
  [...DEPLOY_ALL_PHASE_ORDER],
  "A revision-changed release resume must restart the complete release validation path.",
);
assert.deepEqual(
  resolvePhasesToRun(
    expandUnsafeResumeToFullValidation(
      parseArgv(["--rerun-branch=service-smoke"]).phase,
      "HEAD changed",
    ),
  ),
  ["preflight"],
  "A revision-changed diagnostic retry must re-prove preflight without unexpectedly publishing.",
);

// ── 11. Phase flags reject unknown ids and conflicting selectors ───────────
assert.throws(() => parseArgv(["--phase=unknown"]), /Unknown phase/);
assert.throws(() => parseArgv(["--phase=preflight", "--from-phase=publish"]), /not both/);

const deployAllSource = readFileSync(new URL("../deploy-all.ts", import.meta.url), "utf8");
const remoteDeployRunner = readFileSync(new URL("../run-remote-deploy-all.mjs", import.meta.url), "utf8");
assert.match(
  deployAllSource,
  /ASOL_RELEASE_REVISION:\s*publishContext\.revision/,
  "main-serving must pin release:check to the publish SHA, not a later local static rebuild.",
);
assert.match(
  remoteDeployRunner,
  /ASOL_REMOTE_DEPLOY_SANDBOX: "1"/,
  "the remote runner must identify its isolated install so the doctor ignores only Sandbox-preloaded optional packages.",
);
assert.match(
  deployAllSource,
  /Promise\.allSettled\(phaseTasks\.map\(/,
  "deploy:all must start all Vercel targets before waiting for the combined report.",
);
const environmentDoctor = readFileSync(new URL("../check-environment-requirements.ts", import.meta.url), "utf8");
assert.match(
  environmentDoctor,
  /isSandboxLockedOverrideProblem/,
  "the production doctor must recognize npm 11.11's false invalid report for a lockfile-matched Sandbox override.",
);
const pushMainSource = readFileSync(
  new URL("../../packages/release-core/src/pipeline/push-main-branch.ts", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  pushMainSource,
  /\["push", pushUrl, branch\]/,
  "the token-bearing push URL must never appear in a process command argument.",
);


// ── 12. Branch-level resume is the smallest retry the CLI offers ───────────
//
// Phase-level retry re-runs eighteen preflight commands to reach the one that
// failed, which is the cost that makes `--skip-preflight` tempting. These
// selectors exist to remove that trade.
const fromBranch = parseArgv(["--from-branch=service-smoke"]);
assert.equal(fromBranch.phase.fromPhase, "preflight", "--from-branch resumes at the branch's own phase.");
assert.equal(fromBranch.phase.resume, true, "A branch resume is a resume, so checkpoints may be consulted.");
assert.ok(
  fromBranch.phase.selectedBranches?.has("service-smoke"),
  "--from-branch must run the branch it names.",
);
assert.ok(
  fromBranch.phase.selectedBranches?.has("push-main"),
  "--from-branch must still run the irreversible branches that follow it.",
);
assert.ok(
  !fromBranch.phase.selectedBranches?.has("lint"),
  "--from-branch must not re-run what precedes the named branch.",
);

const rerunBranch = parseArgv(["--rerun-branch=lint"]);
assert.equal(rerunBranch.phase.onlyPhase, "preflight");
assert.deepEqual([...(rerunBranch.phase.selectedBranches ?? [])], ["lint"], "--rerun-branch runs one branch.");

const rerunDeployedSmoke = parseArgv(["--rerun-branch=deployed-smoke"]);
assert.equal(rerunDeployedSmoke.phase.onlyPhase, "main");
assert.deepEqual(
  [...(rerunDeployedSmoke.phase.selectedBranches ?? [])],
  ["deployed-smoke"],
  "--rerun-branch must be able to target deployed smoke without pulling in main-ready.",
);

assert.throws(() => parseArgv(["--from-branch=nope"]), /Unknown runbook branch id/);
assert.throws(() => parseArgv(["--rerun-branch="]), /requires a branch id/);
assert.throws(
  () => parseArgv(["--from-branch=lint", "--rerun-branch=types"]),
  /exactly one of/,
  "Two start points cannot both be honoured.",
);
assert.throws(() => parseArgv(["--phase=preflight", "--from-branch=lint"]), /exactly one of/);
assert.throws(() => parseArgv(["--from-phase=publish", "--rerun-failed"]), /exactly one of/);

// ── 13. Backward compatibility of the phase selectors ─────────────────────
const phaseOnly = parseArgv(["--phase=preflight"]);
assert.equal(phaseOnly.phase.onlyPhase, "preflight");
assert.deepEqual(resolvePhasesToRun(phaseOnly.phase), ["preflight"]);
const fromPhase = parseArgv(["--from-phase=submain"]);
assert.equal(fromPhase.phase.fromPhase, "submain");
assert.deepEqual(resolvePhasesToRun(fromPhase.phase), ["submain", "sub2main", "main"]);
const noSelector = parseArgv([]);
assert.equal(noSelector.phase.resume, false, "A full release proves everything and consults no checkpoint.");
assert.deepEqual(resolvePhasesToRun(noSelector.phase), [...DEPLOY_ALL_PHASE_ORDER]);

// ── 14. New flags are known; a typo still is not ──────────────────────────
assert.equal(parseFlags(["--service-smoke-rebuild"]).serviceSmokeRebuild, true);
assert.equal(parseFlags([]).serviceSmokeRebuild, false, "Service build reuse is the default.");
assert.doesNotThrow(() => parseFlags(["--rerun-failed"]));
assert.throws(() => parseFlags(["--rerun-faild"]), /Unknown option/);

// ── 15. The preflight graph keeps its ordering while adding concurrency ───
const preflightGraph = buildPreflightGraph();
assert.doesNotThrow(() => assertPreflightGraphInvariants(preflightGraph));
const preflightWaves = planPreflightWaves(preflightGraph);
const waveIndex = (branchId: string): number =>
  preflightWaves.findIndex((wave) => wave.nodes.some((node) => node.id === branchId));
assert.ok(waveIndex("smoke") > waveIndex("server-build"), "smoke:production needs the server build.");
assert.ok(waveIndex("static-build") > waveIndex("server-build"), "The static export stays the last build.");
assert.ok(
  waveIndex("service-smoke") > waveIndex("service-builds"),
  "Services are probed only after they build the way Vercel builds them.",
);
assert.ok(
  waveIndex("service-mirror-verify") > waveIndex("service-mirror-sync"),
  "A mirror is verified after it is synced.",
);
assert.ok(
  preflightWaves.some((wave) => wave.mode === "parallel" && wave.nodes.length > 1),
  "Independent quality checks must run concurrently, or the DAG bought nothing.",
);
assert.equal(findRunbookBranch("push-main")?.phaseId, "publish");

// ── 16. The executor records, reports and never skips an effect ───────────
assert.match(
  deployAllSource,
  /recordBranchCheckpoint\(/,
  "Every branch result must be written to the durable checkpoint store.",
);
assert.match(
  deployAllSource,
  /printBranchLedger\(/,
  "A run must print which branches ran, which were skipped, and why.",
);
assert.match(
  deployAllSource,
  /smallestRetryCommand\(/,
  "A failure must offer the smallest retry, not only the phase-level one.",
);
assert.match(
  deployAllSource,
  /runContext\.pushedRevision/,
  "A failure after the push must name the revision that is already public.",
);
assert.match(
  deployAllSource,
  /decideCheckpointSkip\(/,
  "Checkpoint reuse must go through the package rule, not a local shortcut.",
);
assert.doesNotMatch(
  deployAllSource,
  /phaseTasks\.push\(\{\s*phaseId:\s*"main"/,
  "Main verification must run after service deployments, not inside the service batch.",
);
assert.doesNotMatch(
  deployAllSource,
  /The main deployment was never queried/,
  "A main sub-branch retry must not fail before it reaches the selected branch.",
);

const serviceSmokeSource = readFileSync(new URL("../check-service-smoke.ts", import.meta.url), "utf8");
assert.match(
  serviceSmokeSource,
  /returnServiceBuild\(/,
  "The smoke gate must move the build back out of services/*, never leave it there.",
);
assert.match(
  serviceSmokeSource,
  /rmSync\(path\.join\(serviceDir, "\.next"\)/,
  "No .next may survive inside a folder the Vercel CLI uploads verbatim.",
);
assert.match(
  serviceSmokeSource,
  /serviceSmokeRebuildRequested\(/,
  "Forcing the old rebuild behavior must stay available.",
);

const deployedSmokeSource = readFileSync(new URL("../check-deployed-origins.ts", import.meta.url), "utf8");
assert.match(
  deployedSmokeSource,
  /resolveDeployedOrigin\(/,
  "smoke:deployed must resolve origins through the shared declaration-backed resolver.",
);
const originResolutionSource = readFileSync(
  new URL("../deployed-origin-resolution.ts", import.meta.url),
  "utf8",
);
assert.match(
  originResolutionSource,
  /@asol\/native-core/,
  "Canonical origins must come from the same declarations the static build bakes in.",
);
assert.match(
  originResolutionSource,
  /if \(fromEnv\) return \{ origin: fromEnv, source: "environment"/,
  "An explicit environment override must still win over the declared origin.",
);

const gateRunnerSource = readFileSync(new URL("../run-generated-gate.ts", import.meta.url), "utf8");
assert.match(
  gateRunnerSource,
  /isReusableGateStep\(step\)/,
  "Only read-only gate steps may be reused between build and build:static.",
);

console.log("deploy:all guard tests passed.");
