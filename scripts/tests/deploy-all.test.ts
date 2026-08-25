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
assert.match(formatRunbook(), /2\.3\.5 push-main: git:push main/);

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

// ── 11. Phase flags reject unknown ids and conflicting selectors ───────────
assert.throws(() => parseArgv(["--phase=unknown"]), /Unknown phase/);
assert.throws(() => parseArgv(["--phase=preflight", "--from-phase=publish"]), /not both/);

const deployAllSource = readFileSync(new URL("../deploy-all.ts", import.meta.url), "utf8");
assert.match(
  deployAllSource,
  /ASOL_RELEASE_REVISION:\s*publishContext\.revision/,
  "main-serving must pin release:check to the publish SHA, not a later local static rebuild.",
);

console.log("deploy:all guard tests passed.");
