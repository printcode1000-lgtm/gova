import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type DeployPushTarget,
  ALL_DEPLOY_PUSH_TARGETS,
  resolveServiceDeployTargets,
} from "./deploy-push-target-choice";
import {
  DeploymentNpmScriptError,
  runDeploymentNpmScript,
} from "@asol/release-core";
import { pushMainBranch } from "@asol/release-core";
import {
  type VercelDeploymentReport,
  verifyAccountTokenAccess,
  waitForVercelProductionDeployment,
} from "@asol/vercel-deploy-core";
import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";
import { ensureReleaseSecretsRestored } from "./ensure-release-secrets-restored";
import { protectedDocumentationCommitArgs } from "./deployment-commit-trailer";
import { loadReleaseEnvironment } from "./load-release-env";
import { publishReleaseReadiness } from "./release-readiness-publish";
import {
  captureReleaseRollbackBaseline,
  rollbackReleaseBaseline,
} from "./release-rollback-baseline";

loadReleaseEnvironment();

const ROOT = process.cwd();
const MAIN_BRANCH = "main";
const GIT_INDEX_LOCK = path.join(ROOT, ".git", "index.lock");
const ROOT_VERCEL_LINK = path.join(ROOT, ".vercel", "project.json");
const STALE_GIT_LOCK_AGE_MS = 2 * 60 * 1000;
const FAIL_PREFIX = "[deploy:push] FAILED —";
const RELEASE_MANIFEST = "public/asol-web-manifest.json";

interface DeployPushFlags {
  allowEmpty: boolean;
  allowManifestDowngrade: boolean;
  allowScratchFiles: boolean;
}

interface ParsedArgv {
  flags: DeployPushFlags;
  targetArgs: string[];
}

const DEPLOY_PUSH_FLAG_NAMES = new Set([
  "--allow-empty",
  "--allow-manifest-downgrade",
  "--allow-scratch-files",
]);

const SCRATCH_FILE_PATTERNS = [
  /(^|\/)__probe/i,
  /\.(log|tmp|bak|orig|rej)$/i,
  /(^|\/)scratchpad\//i,
  /(^|\/)\.DS_Store$/,
];

const ISOLATED_DEPLOYS: Record<
  DeployPushTarget,
  { target: DeployPushTarget; script: string }
> = {
  notifications: { target: "notifications", script: "notifications:deploy" },
  products: { target: "products", script: "products:deploy" },
  orders: { target: "orders", script: "orders:deploy" },
  profiles: { target: "profiles", script: "profiles:deploy" },
  submain: { target: "submain", script: "submain:deploy" },
  sub2main: { target: "sub2main", script: "sub2main:deploy" },
};

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function hasStagedChanges(): boolean {
  try {
    execFileSync("git", ["diff", "--cached", "--quiet"], {
      cwd: ROOT,
      stdio: "ignore",
    });
    return false;
  } catch {
    return true;
  }
}

function assertMainBranch(): void {
  const branch = git(["branch", "--show-current"]);
  if (branch !== MAIN_BRANCH) {
    throw new Error(
      `deploy:push must run from ${MAIN_BRANCH}; current branch is ${branch || "detached HEAD"}.`,
    );
  }
}

function hasRunningGitProcess(): boolean {
  try {
    if (process.platform === "win32") {
      const output = execFileSync(
        "tasklist",
        ["/FI", "IMAGENAME eq git.exe", "/FO", "CSV", "/NH"],
        { encoding: "utf8", windowsHide: true },
      );
      return /"git\.exe"/i.test(output);
    }
    const output = execFileSync("pgrep", ["-x", "git"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

function clearStaleGitIndexLock(): void {
  if (!existsSync(GIT_INDEX_LOCK)) return;
  const ageMs = Date.now() - statSync(GIT_INDEX_LOCK).mtimeMs;
  if (ageMs < STALE_GIT_LOCK_AGE_MS || hasRunningGitProcess()) {
    throw new Error(
      "Git index.lock is active. Close the other Git operation and run deploy:push again.",
    );
  }
  unlinkSync(GIT_INDEX_LOCK);
  console.log(
    `[deploy:push] Removed abandoned .git/index.lock (${Math.round(ageMs / 1000)} seconds old).`,
  );
}

function assertMainDeploymentCredentials(): void {
  if (!process.env.VERCEL_TOKEN?.trim()) {
    throw new Error(
      "VERCEL_TOKEN is required to verify the main Vercel deployment. Set it before running deploy:push.",
    );
  }
  if (!existsSync(ROOT_VERCEL_LINK)) {
    throw new Error(
      ".vercel/project.json is required to identify the GitHub-linked main project.",
    );
  }
}

function parseArgv(argv: readonly string[]): ParsedArgv {
  const unknown = argv.filter(
    (arg) => !DEPLOY_PUSH_FLAG_NAMES.has(arg) && !arg.startsWith("--vercel-target="),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Unknown option(s): ${unknown.join(", ")}. Known flags: ${[
        ...DEPLOY_PUSH_FLAG_NAMES,
      ].join(", ")}; target flag: --vercel-target=<main|none|all|${ALL_DEPLOY_PUSH_TARGETS.join("|")}>.`,
    );
  }
  return {
    flags: {
      allowEmpty: argv.includes("--allow-empty"),
      allowManifestDowngrade: argv.includes("--allow-manifest-downgrade"),
      allowScratchFiles: argv.includes("--allow-scratch-files"),
    },
    targetArgs: argv.filter((arg) => arg.startsWith("--vercel-target=")),
  };
}

function changedPaths(): string[] {
  return git(["status", "--porcelain"])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim());
}

function assertNoScratchFiles(flags: DeployPushFlags): void {
  const scratch = changedPaths().filter((entry) =>
    SCRATCH_FILE_PATTERNS.some((pattern) => pattern.test(entry)),
  );
  if (scratch.length > 0 && !flags.allowScratchFiles) {
    throw new Error(
      "Refusing to publish scratch files:\n" +
        scratch.map((entry) => `  - ${entry}`).join("\n") +
        "\nRemove them, or pass --allow-scratch-files if they are intentional.",
    );
  }
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(/[.\-+]/);
  const rightParts = right.split(/[.\-+]/);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const a = leftParts[index] ?? "";
    const b = rightParts[index] ?? "";
    const numericA = Number(a);
    const numericB = Number(b);
    if (Number.isFinite(numericA) && Number.isFinite(numericB) && a !== "" && b !== "") {
      if (numericA !== numericB) return numericA < numericB ? -1 : 1;
      continue;
    }
    if (a !== b) return a < b ? -1 : 1;
  }
  return 0;
}

function assertReleaseManifestNotDowngraded(flags: DeployPushFlags): void {
  const manifestPath = path.join(ROOT, RELEASE_MANIFEST);
  if (!existsSync(manifestPath)) return;

  let committed: Record<string, unknown>;
  let current: Record<string, unknown>;
  try {
    committed = JSON.parse(git(["show", `HEAD:${RELEASE_MANIFEST}`]));
    current = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return;
  }

  const downgraded = (["releaseId", "version", "minimumNativeVersion"] as const).filter(
    (key) => {
      const before = committed[key];
      const after = current[key];
      return (
        typeof before === "string" &&
        typeof after === "string" &&
        before !== after &&
        compareVersions(after, before) < 0
      );
    },
  );

  if (downgraded.length > 0 && !flags.allowManifestDowngrade) {
    throw new Error(
      `${RELEASE_MANIFEST} would be downgraded (${downgraded.join(", ")}).\n` +
        "Restore it or pass --allow-manifest-downgrade if this is intentional.",
    );
  }
}

function assertSomethingToPush(flags: DeployPushFlags): void {
  if (flags.allowEmpty) return;
  if (changedPaths().length > 0) return;
  let remoteHead = "";
  try {
    remoteHead = git(["rev-parse", `origin/${MAIN_BRANCH}`]);
  } catch {
    return;
  }
  if (remoteHead === git(["rev-parse", "HEAD"])) {
    throw new Error(
      `Nothing to push: the working tree is clean and HEAD already matches origin/${MAIN_BRANCH}.\n` +
        "Pass --allow-empty to redeploy the current commit anyway.",
    );
  }
}

async function assertVercelAccountsForTargets(targets: readonly DeployPushTarget[]): Promise<void> {
  const declarations = [
    ACCOUNT_DECLARATIONS.gova,
    ...targets.map((target) => ACCOUNT_DECLARATIONS[target]),
  ];
  const reports = [];
  for (const declaration of declarations) {
    reports.push(await verifyAccountTokenAccess(declaration));
  }
  console.log("[deploy:push] Vercel account access verified:");
  console.table(
    reports.map((report) => ({
      target: report.name,
      project: report.project,
      token: report.tokenEnvVar,
      scope: report.teamId ? `team:${report.teamId}` : report.account,
    })),
  );
}

async function assertFastPublishReadiness(
  targets: readonly DeployPushTarget[],
  flags: DeployPushFlags,
): Promise<void> {
  assertMainBranch();
  await ensureReleaseSecretsRestored("deploy:push");
  assertMainDeploymentCredentials();
  await assertVercelAccountsForTargets(targets);
  assertNoScratchFiles(flags);
  assertReleaseManifestNotDowngraded(flags);
  assertSomethingToPush(flags);
}

function printFinalSummary(reports: VercelDeploymentReport[]): void {
  console.log("\n[deploy:push] Final verified production report");
  console.table(
    reports.map((report) => ({
      target: report.target,
      account: report.account,
      project: report.project,
      comment: report.comment,
      state: report.state,
      url: report.url ?? "-",
      message: report.errorCode
        ? `${report.errorCode}: ${report.message}`
        : report.message,
    })),
  );
}

function printRollbackGuidance(revision: string): void {
  console.error(
    "\n[deploy:push] The commit is already on GitHub. To roll back:\n" +
      `  git revert ${revision}\n` +
      `  git push origin ${MAIN_BRANCH}\n` +
      "Or promote the previous production deployment from the Vercel dashboard.",
  );
}

function formatSuccessLine(): string {
  return (
    "[deploy:push] SUCCESS — secrets backup completed, GitHub push verified; " +
    `control, ${ALL_DEPLOY_PUSH_TARGETS.length} isolated Vercel production targets, ` +
    "and main are READY, and exact-SHA release readiness is published."
  );
}

/**
 * A targeted deploy is maintenance, and maintenance never publishes.
 *
 * `deploy:push` used to push `main` for any selection, including
 * `--vercel-target=none`. Under the release barrier that is a trap: the push
 * starts the GitHub-linked gova build, the build waits for exact-SHA readiness
 * that a partial deploy must never mark, and gova fails closed after the
 * timeout. So a partial selection deploys the named accounts from the current
 * HEAD and stops — no commit, no push, no readiness.
 *
 * `docs/07-mobile-and-release/release-commands.md` § "Targeted maintenance
 * deploys" records the rule this enforces.
 */
async function runTargetedMaintenanceDeploy(
  targets: readonly DeployPushTarget[],
): Promise<void> {
  const revision = git(["rev-parse", "HEAD"]);
  const timestamp = new Date().toISOString();
  const runId = `${timestamp.replace(/[^0-9]/g, "").slice(0, 17)}-${revision.slice(0, 12)}`;
  await ensureReleaseSecretsRestored("deploy:push");
  await assertVercelAccountsForTargets(targets);
  console.log(
    `[deploy:push] Targeted maintenance deploy of ${targets.join(", ")} at ${revision.slice(0, 12)}. ` +
      "main is not pushed and no SHA is marked ready.",
  );
  const reports = await deploySelectedAccounts({ targets, timestamp, revision, runId });
  printFinalSummary(reports);
  console.log(
    `[deploy:push] SUCCESS — ${targets.length} maintenance target(s) READY. ` +
      "Run deploy:all or deploy:push with the complete set to publish a release.",
  );
}

async function verifyMainDeployment(input: {
  revision: string;
  comment: string;
}): Promise<VercelDeploymentReport> {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    throw new Error("VERCEL_TOKEN is required to verify the GitHub-linked main deployment.");
  }
  if (!existsSync(ROOT_VERCEL_LINK)) {
    throw new Error(".vercel/project.json is required to identify the GitHub-linked main project.");
  }
  const link = JSON.parse(readFileSync(ROOT_VERCEL_LINK, "utf8")) as {
    projectId?: string;
    orgId?: string;
    projectName?: string;
  };
  if (!link.projectId) throw new Error("The main Vercel project link has no projectId.");
  return waitForVercelProductionDeployment({
    token,
    project: link.projectId,
    target: "main",
    account: link.orgId ?? "personal",
    comment: input.comment,
    teamId: link.orgId,
    revision: input.revision,
  });
}

async function deploySelectedAccounts(input: {
  targets: readonly DeployPushTarget[];
  timestamp: string;
  revision: string;
  runId: string;
}): Promise<VercelDeploymentReport[]> {
  const outcomes = await Promise.allSettled(
    input.targets.map(async (target) => {
      const deployment = ISOLATED_DEPLOYS[target];
      const comment = `deploy(${deployment.target}): ${input.timestamp} @ ${input.revision.slice(0, 12)}`;
      const report = await runDeploymentNpmScript(deployment.script, {
        logPrefix: "deploy:push",
        captureReport: true,
        env: {
          ASOL_DEPLOYMENT_RUN_ID: `${input.runId}-${deployment.target}`,
          ASOL_DEPLOYMENT_REVISION: input.revision,
          ASOL_DEPLOYMENT_COMMENT: comment,
        },
      });
      if (!report) throw new Error(`${deployment.script} returned no deployment report.`);
      return report;
    }),
  );

  const reports: VercelDeploymentReport[] = [];
  const failures: string[] = [];
  for (const outcome of outcomes) {
    if (outcome.status === "fulfilled") {
      reports.push(outcome.value);
      continue;
    }
    if (outcome.reason instanceof DeploymentNpmScriptError && outcome.reason.report) {
      reports.push(outcome.reason.report);
    }
    failures.push(outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason));
  }
  if (failures.length > 0) {
    const error = new Error(`One or more isolated deployments failed: ${failures.join(" | ")}`);
    Object.assign(error, { reports });
    throw error;
  }
  return reports;
}

/**
 * Control is deployed by its own command, not through `ISOLATED_DEPLOYS`, so the
 * six-workload arrays stay exactly six while a full release still updates the
 * control runtime at the same SHA.
 */
async function deployControlRuntime(input: {
  timestamp: string;
  revision: string;
  runId: string;
  logPrefix: string;
}): Promise<VercelDeploymentReport> {
  const comment = `deploy(control): ${input.timestamp} @ ${input.revision.slice(0, 12)}`;
  const report = await runDeploymentNpmScript("control:deploy", {
    logPrefix: input.logPrefix.replace(/[[\]]/g, ""),
    captureReport: true,
    env: {
      ASOL_DEPLOYMENT_RUN_ID: `${input.runId}-control`,
      ASOL_DEPLOYMENT_REVISION: input.revision,
      ASOL_DEPLOYMENT_COMMENT: comment,
    },
  }).catch((error: unknown) => {
    if (error instanceof DeploymentNpmScriptError && error.report) {
      const failure = new Error(`control:deploy failed: ${error.message}`);
      Object.assign(failure, { reports: [error.report] });
      throw failure;
    }
    throw error;
  });
  if (!report) throw new Error("control:deploy returned no deployment report.");
  if (report.state !== "READY") {
    const failure = new Error(`control is ${report.state}: ${report.message}`);
    Object.assign(failure, { reports: [report] });
    throw failure;
  }
  return report;
}

/**
 * The one ordered release transaction, shared by every path that publishes.
 *
 * Order is the contract, not a preference. `docs/07-mobile-and-release/release-commands.md`
 * records why each step sits where it does; the short version is that the
 * GitHub-linked gova build is blocked on exact-SHA readiness, so nothing may
 * mark a SHA ready before control and all six workloads are READY, and main
 * must not be verified while a backend is still deploying.
 */
async function runReleaseTransaction(input: {
  readonly revision: string;
  readonly timestamp: string;
  readonly runId: string;
  readonly mainComment: string;
  readonly logPrefix: string;
  readonly command: "deploy:revision" | "deploy:push";
  readonly sandboxName: string;
  readonly initiatedByUid: string;
}): Promise<VercelDeploymentReport[]> {
  const targets = [...ALL_DEPLOY_PUSH_TARGETS];

  // Captured before the first production mutation so every later failure can
  // re-promote what was live instead of pausing for instructions.
  const baselines = await captureReleaseRollbackBaseline(input.logPrefix);

  const reports: VercelDeploymentReport[] = [];
  try {
    // The six Git-disconnected workloads, then control as its own mandatory
    // step. Control is never a seventh workload target, but a release that did
    // not deploy it would serve a control revision behind the SHA.
    reports.push(
      ...(await deploySelectedAccounts({
        targets,
        timestamp: input.timestamp,
        revision: input.revision,
        runId: input.runId,
      })),
    );
    reports.push(
      await deployControlRuntime({
        timestamp: input.timestamp,
        revision: input.revision,
        runId: input.runId,
        logPrefix: input.logPrefix,
      }),
    );

    // Only now may the GitHub-linked gova build publish: the barrier it waits on
    // is this state, and nothing else in this process may mark the SHA ready.
    await publishReleaseReadiness({
      revision: input.revision,
      runId: input.runId,
      timestamp: input.timestamp,
      command: input.command,
      sandboxName: input.sandboxName,
      initiatedByUid: input.initiatedByUid,
      logTail: `${input.command} published durable exact-SHA readiness after control and six workload deployments.`,
      logPrefix: input.logPrefix,
      reports,
    });

    // Sequential on purpose. Verifying main while the backends were still
    // deploying is what let a gova build publish against unfinished runtimes.
    const mainReport = await verifyMainDeployment({
      revision: input.revision,
      comment: input.mainComment,
    });
    reports.unshift(mainReport);
    if (mainReport.state !== "READY") {
      throw new Error(`main deployment is ${mainReport.state}: ${mainReport.message}`);
    }
    return reports;
  } catch (error) {
    const partial = (error as { reports?: VercelDeploymentReport[] }).reports;
    if (partial) reports.push(...partial);
    printFinalSummary(reports);
    const restored = await rollbackReleaseBaseline(baselines, input.logPrefix).catch(
      (rollbackError) => {
        console.error(
          `${input.logPrefix} Rollback failed — ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        );
        return false;
      },
    );
    throw new Error(
      [
        error instanceof Error ? error.message : String(error),
        restored
          ? "Rolled back to the captured production baseline."
          : "Rollback did not restore the captured production baseline.",
        ...failedReportDetails(reports),
      ].join("\n"),
    );
  }
}

/**
 * Deploy a commit that is already on main without creating or pushing another
 * commit. This is the GitHub-push automation path; the caller authenticates
 * the event and the sandbox pins HEAD before reaching this function.
 */
export async function deployExistingRevision(revision: string): Promise<void> {
  const normalizedRevision = revision.trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(normalizedRevision)) {
    throw new Error("--revision must be a full 40-character Git commit SHA.");
  }
  if (git(["rev-parse", "HEAD"]).toLowerCase() !== normalizedRevision) {
    throw new Error("The checked-out HEAD does not match --revision.");
  }
  if (git(["status", "--porcelain"])) {
    throw new Error("The revision deployment requires a clean working tree.");
  }

  const targets = [...ALL_DEPLOY_PUSH_TARGETS];
  await ensureReleaseSecretsRestored("deploy:revision");
  assertMainDeploymentCredentials();
  await assertVercelAccountsForTargets(targets);

  const timestamp = new Date().toISOString();
  const runId = `${timestamp.replace(/[^0-9]/g, "").slice(0, 17)}-${normalizedRevision.slice(0, 12)}`;
  const mainComment = `deploy(revision): ${timestamp} @ ${normalizedRevision.slice(0, 12)}`;

  const reports = await runReleaseTransaction({
    revision: normalizedRevision,
    timestamp,
    runId,
    mainComment,
    logPrefix: "[deploy:revision]",
    command: "deploy:revision",
    sandboxName: "deploy-revision-sandbox",
    initiatedByUid: "github-push",
  });

  printFinalSummary(reports);
  console.log(
    `[deploy:revision] SUCCESS — control, ${targets.length} isolated Vercel targets, and main are READY at ${normalizedRevision.slice(0, 12)}.`,
  );
}

function failedReportDetails(reports: readonly VercelDeploymentReport[]): string[] {
  return reports
    .filter((report) => report.state !== "READY")
    .map((report) =>
      [
        `target=${report.target}`,
        `account=${report.account}`,
        `project=${report.project}`,
        `state=${report.state}`,
        report.errorCode ? `code=${report.errorCode}` : null,
        `message=${report.message}`,
        report.url ? `url=${report.url}` : null,
      ]
        .filter(Boolean)
        .join(", "),
    );
}

function verifyGitHubPush(revision: string): void {
  console.log("[deploy:push] Verifying origin/main matches the pushed commit...");
  // Fetch with an explicit refspec so origin/main is always written as a
  // remote-tracking ref. A plain `git fetch origin main` only updates
  // FETCH_HEAD in shallow or detached clones (e.g. the Vercel Sandbox), which
  // leaves `git rev-parse origin/main` failing with "ambiguous argument".
  execFileSync("git", ["fetch", "origin", `${MAIN_BRANCH}:refs/remotes/origin/${MAIN_BRANCH}`], {
    cwd: ROOT,
    stdio: "inherit",
  });
  const remoteRevision = git(["rev-parse", `origin/${MAIN_BRANCH}`]);
  if (remoteRevision !== revision) {
    throw new Error(
      `GitHub verification failed: origin/${MAIN_BRANCH} is ${remoteRevision.slice(0, 12)} but expected ${revision.slice(0, 12)} after push.`,
    );
  }
  console.log(`[deploy:push] GitHub push verified: origin/${MAIN_BRANCH} = ${revision.slice(0, 12)}.`);
}

function fail(message: string, revision?: string): void {
  if (revision) printRollbackGuidance(revision);
  console.error(`${FAIL_PREFIX} ${message}`);
  process.exitCode = 1;
}

export const __testables = {
  parseArgv,
  compareVersions,
  SCRATCH_FILE_PATTERNS,
  RELEASE_MANIFEST,
  formatSuccessLine,
  FAIL_PREFIX,
  hasStagedChanges,
};

async function main(): Promise<void> {
  const { flags, targetArgs } = parseArgv(process.argv.slice(2));
  const isolatedTargets = await resolveServiceDeployTargets(targetArgs);

  // Publishing is all-or-nothing: control and all six workloads, or no push.
  if (isolatedTargets.length !== ALL_DEPLOY_PUSH_TARGETS.length) {
    await runTargetedMaintenanceDeploy(isolatedTargets);
    return;
  }

  await assertFastPublishReadiness(isolatedTargets, flags);

  try {
    await runDeploymentNpmScript("secrets:backup", { logPrefix: "deploy:push" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`secrets:backup did not complete: ${message}`);
    return;
  }

  clearStaleGitIndexLock();

  const timestamp = new Date().toISOString();
  const mainComment = `deploy(push): ${timestamp}`;
  console.log(`[deploy:push] Creating deployment commit: ${mainComment}`);

  try {
    execFileSync("git", ["add", "-A"], { cwd: ROOT, stdio: "inherit" });
    if (hasStagedChanges()) {
      const commitArgs = flags.allowEmpty
        ? ["commit", "--allow-empty", "-m", mainComment]
        : ["commit", "-m", mainComment];
      commitArgs.push(...protectedDocumentationCommitArgs(ROOT, "[deploy:push]"));
      execFileSync("git", commitArgs, {
        cwd: ROOT,
        stdio: "inherit",
      });
    } else if (flags.allowEmpty) {
      execFileSync("git", ["commit", "--allow-empty", "-m", mainComment], {
        cwd: ROOT,
        stdio: "inherit",
      });
    } else {
      console.log(
        "[deploy:push] No staged changes; reusing the current HEAD commit for this push.",
      );
    }
    if (git(["status", "--porcelain"])) {
      throw new Error(
        "The working tree changed while creating the deployment commit; refusing to push inconsistent source.",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`git commit did not complete: ${message}`);
    return;
  }

  const revision = git(["rev-parse", "HEAD"]);
  const runId = `${timestamp.replace(/[^0-9]/g, "").slice(0, 17)}-${revision.slice(0, 12)}`;

  console.log("[deploy:push] Pushing main to GitHub...");
  try {
    pushMainBranch(ROOT, MAIN_BRANCH, "deploy:push");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`git push to origin/${MAIN_BRANCH} did not complete: ${message}`);
    return;
  }

  try {
    verifyGitHubPush(revision);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(message);
    return;
  }

  let reports: VercelDeploymentReport[];
  try {
    reports = await runReleaseTransaction({
      revision,
      timestamp,
      runId,
      mainComment,
      logPrefix: "[deploy:push]",
      command: "deploy:push",
      sandboxName: "deploy-push-cli",
      initiatedByUid: "deploy-push",
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error), revision);
    return;
  }

  printFinalSummary(reports);
  console.log(formatSuccessLine());
}

/**
 * Only deploy when this file is the process entrypoint.
 * Importing the module must not commit or push to production.
 */
const invokedDirectly = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false;

if (invokedDirectly) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    fail(message);
  });
}
