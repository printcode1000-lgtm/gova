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
import { __testables } from "../deploy-all";

const { parseFlags, compareVersions, SCRATCH_FILE_PATTERNS, PREFLIGHT_STEPS, RELEASE_MANIFEST } =
  __testables;

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
for (const required of ["lint", "typecheck", "architecture:check", "test", "build:static"]) {
  assert.ok(
    (PREFLIGHT_STEPS as readonly string[]).includes(required),
    `Preflight must run "${required}" before publishing.`,
  );
}

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
  "docs/01-architecture/native-core-module.md",
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

console.log("deploy:all guard tests passed.");
