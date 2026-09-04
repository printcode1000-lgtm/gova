/**
 * Guards on `deploy:push` target parsing and entrypoint.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { __testables as deployPushTestables } from "../deploy-push";
import { __testables } from "../deploy-push-target-choice";

async function run(): Promise<void> {
const { parseProvidedTargets, expandSelection } = __testables;
const {
  parseArgv,
  compareVersions,
  SCRATCH_FILE_PATTERNS,
  RELEASE_MANIFEST,
  formatSuccessLine,
  FAIL_PREFIX,
  githubRepositoryFromRemote,
  assertMainGitDeploymentNotRejected,
} = deployPushTestables;

assert.ok(true, "Importing deploy-push must not trigger a deployment.");

assert.deepEqual(parseArgv(["--vercel-target=none"]), {
  flags: {
    allowEmpty: false,
    allowManifestDowngrade: false,
    allowScratchFiles: false,
    fast: false,
  },
  targetArgs: ["--vercel-target=none"],
});
assert.deepEqual(parseArgv(["--allow-empty", "--allow-scratch-files"]), {
  flags: {
    allowEmpty: true,
    allowManifestDowngrade: false,
    allowScratchFiles: true,
    fast: false,
  },
  targetArgs: [],
});
assert.equal(parseArgv(["--allow-manifest-downgrade"]).flags.allowManifestDowngrade, true);
// `--fast` is a flag, never a target: it must not reach parseProvidedTargets.
assert.equal(parseArgv(["--fast"]).flags.fast, true);
assert.deepEqual(parseArgv(["--fast"]).targetArgs, []);
assert.throws(() => parseArgv(["--skip-preflight"]), /Unknown option/);

assert.deepEqual(parseProvidedTargets([]), null);
assert.deepEqual(parseProvidedTargets(["--vercel-target=notifications"]), ["notifications"]);
assert.deepEqual(
  parseProvidedTargets(["--vercel-target=main,products"]),
  ["products"],
);
assert.equal(parseProvidedTargets(["--vercel-target=all"]), "all");
assert.equal(parseProvidedTargets(["--vercel-target=main"]), "none");
assert.equal(parseProvidedTargets(["--vercel-target=none"]), "none");
assert.deepEqual(expandSelection("none"), []);
assert.deepEqual(expandSelection("all"), [
  "notifications",
  "products",
  "orders",
  "profiles",
  "submain",
  "sub2main",
]);
assert.deepEqual(parseProvidedTargets(["--vercel-target=submain"]), ["submain"]);
assert.deepEqual(parseProvidedTargets(["--vercel-target=sub2main"]), ["sub2main"]);

assert.throws(() => parseProvidedTargets(["--vercel-target=unknown"]), /Unknown Vercel target/);
assert.throws(
  () => parseProvidedTargets(["--vercel-target=all", "--vercel-target=main"]),
  /Pass --vercel-target=all alone/,
);
assert.throws(
  () => parseProvidedTargets(["--vercel-target=none", "--vercel-target=main"]),
  /Pass --vercel-target=none alone/,
);

assert.ok(compareVersions("0.1.0", "0.1.15") < 0);
assert.ok(compareVersions("0.1.15", "0.1.0") > 0);
assert.equal(compareVersions("0.1.15", "0.1.15"), 0);
assert.equal(RELEASE_MANIFEST, "public/asol-web-manifest.json");
assert.equal(FAIL_PREFIX, "[deploy:push] FAILED —");
assert.match(formatSuccessLine(true), /control, 6 isolated Vercel production targets, and main are READY/);
assert.equal(
  githubRepositoryFromRemote("https://github.com/printcode1000-lgtm/gova.git"),
  "printcode1000-lgtm/gova",
);
assert.equal(
  githubRepositoryFromRemote("git@github.com:printcode1000-lgtm/gova.git"),
  "printcode1000-lgtm/gova",
);
assert.equal(githubRepositoryFromRemote("https://gitlab.com/example/gova.git"), null);
await assert.rejects(
  () =>
    assertMainGitDeploymentNotRejected("a".repeat(40), {
      repository: "printcode1000-lgtm/gova",
      timeoutMs: 0,
      fetchImpl: async () =>
        Response.json({
          statuses: [
            {
              context: "Vercel",
              state: "failure",
              description: "Deployment rate limited — retry in 24 hours.",
              target_url: "https://vercel.com/hesham-101?upgradeToPro=build-rate-limit",
            },
          ],
        }),
    }),
  /rate limit/i,
);
await assert.doesNotReject(() =>
  assertMainGitDeploymentNotRejected("b".repeat(40), {
    repository: "printcode1000-lgtm/gova",
    timeoutMs: 0,
    fetchImpl: async () =>
      Response.json({ statuses: [{ context: "Vercel", state: "pending" }] }),
  }),
);

const vercelConfig = JSON.parse(
  readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
) as { git?: { deploymentEnabled?: Record<string, boolean> }; ignoreCommand?: unknown };
assert.deepEqual(vercelConfig.git?.deploymentEnabled, { "*": false, main: false });
assert.equal("ignoreCommand" in vercelConfig, false);
const deployPushSource = readFileSync(new URL("../deploy-push.ts", import.meta.url), "utf8");

/**
 * Publishing is one ordered transaction, and every path that publishes uses it.
 * A partial target selection is maintenance and must never push `main`: the push
 * starts the gova build, which then waits for a readiness a partial deploy is
 * forbidden to mark.
 */
assert.doesNotMatch(
  deployPushSource,
  /Promise\.allSettled\(\[\s*deploySelectedAccounts\([^)]*\),\s*verifyMainDeployment\(/,
  "No publish path may race main verification against unfinished backend deployments.",
);
/**
 * A partial selection is refused, never diverted.
 *
 * The maintenance path used to deploy the named accounts from the current HEAD.
 * It wrote no git and therefore never checked the branch, which made it the one
 * way a publish could reach Vercel from something other than `main`. It is gone:
 * an account is now deployed on its own with its own `*:deploy` script.
 */
assert.match(
  deployPushSource,
  /if \(isolatedTargets\.length !== ALL_DEPLOY_PUSH_TARGETS\.length\) \{\s*fail\(/,
  "A partial --vercel-target selection must be refused before any git write.",
);
for (const removed of ["runTargetedMaintenanceDeploy", "deployExistingRevision", "deploy:revision"]) {
  assert.ok(
    !deployPushSource.includes(removed),
    `${removed} was removed with the GitHub deployment workflow and must not come back.`,
  );
}

/**
 * `--fast` skips `secrets:backup`, so the success line must not claim it ran.
 * A final line that names a skipped step teaches the wrong recovery.
 */
assert.match(formatSuccessLine(true), /secrets backup completed/);
assert.match(formatSuccessLine(false), /secrets backup skipped \(--fast\)/);

/** The transaction itself is where the ordering contract is enforced. */
const transactionBody = deployPushSource.slice(
  deployPushSource.indexOf("async function runReleaseTransaction("),
  deployPushSource.indexOf("function failedReportDetails("),
);
for (const [needle, why] of [
  ["captureReleaseRollbackBaseline(", "capture a rollback baseline before the first production mutation"],
  ["deployControlRuntime(", "deploy control at the same SHA through its own step"],
  ["publishReleaseReadiness(", "publish exact-SHA readiness so the gova build can publish"],
  ["rollbackReleaseBaseline(", "roll back automatically instead of pausing"],
] as const) {
  assert.ok(transactionBody.includes(needle), `The release transaction must ${why}.`);
}
/**
 * Readiness is what unblocks the gova build, so a failed release must withdraw
 * it before rolling anything back. Leaving `ready` standing let a late frontend
 * build publish over backends the rollback had already reverted.
 */
assert.match(
  transactionBody,
  /retractReleaseReadiness\(\{/,
  "A failed release must withdraw the readiness it published.",
);
assert.ok(
  transactionBody.indexOf("retractReleaseReadiness(") <
    transactionBody.indexOf("rollbackReleaseBaseline("),
  "Readiness must be withdrawn before the rollback re-promotes the previous deployments.",
);
assert.match(
  transactionBody,
  /if \(readinessPublished\) \{/,
  "Only a readiness that was actually published may be withdrawn.",
);

assert.ok(
  transactionBody.indexOf("publishReleaseReadiness(") <
    transactionBody.indexOf("await deployMainRuntime("),
  "Readiness must be published before the explicit gova deployment.",
);

/**
 * A mirror that does not build is a deployment that fails after the push. The
 * root typecheck does not cover the service trees, so this is the only place a
 * `deploy:push` learns it before `main` moves.
 */
assert.match(
  deployPushSource,
  /await assertServiceMirrorsBuild\(\);/,
  "deploy:push must prove the service mirrors build before it pushes main.",
);
const mirrorGate = deployPushSource.slice(
  deployPushSource.indexOf("async function assertServiceMirrorsBuild("),
);
for (const command of ["services:sync", "services:build", "control:build"]) {
  assert.ok(
    mirrorGate.includes(`"${command}"`),
    `The mirror gate must run ${command}: a mirror built from stale sources proves nothing.`,
  );
}
assert.ok(
  mirrorGate.indexOf('"services:sync"') < mirrorGate.indexOf('"services:build"'),
  "The mirrors must be synced before they are built.",
);

// A partial selection must be refused before anything is restored, backed up or
// written, so a publish can never begin against an incomplete target set.
const mainFn = deployPushSource.slice(deployPushSource.indexOf("async function main("));
assert.ok(
  mainFn.indexOf("isolatedTargets.length !== ALL_DEPLOY_PUSH_TARGETS.length") <
    mainFn.indexOf("await assertFastPublishReadiness("),
  "A partial selection must be refused before the publish readiness gate runs.",
);

// The deployment commit must be written on top of origin/main, not beside it.
assert.ok(
  mainFn.indexOf("advanceToOriginMain()") < mainFn.indexOf('"git", ["add", "-A"]'),
  "deploy:push must advance HEAD to origin/main before it stages the tree.",
);
const advance = deployPushSource.slice(
  deployPushSource.indexOf("function advanceToOriginMain("),
);
assert.ok(
  advance.includes('"--ff-only"'),
  "Only a fast-forward is automatic: a rebase over an uncommitted tree loses work.",
);

for (const entry of ["debug.log", "notes.tmp", "src/__probe__.ts", "scratchpad/out.txt"]) {
  assert.ok(
    SCRATCH_FILE_PATTERNS.some((pattern) => pattern.test(entry)),
    `${entry} must be blocked by deploy:push unless explicitly allowed.`,
  );
}

console.log("deploy:push guard tests passed.");
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
