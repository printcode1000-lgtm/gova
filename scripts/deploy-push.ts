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
import { loadReleaseEnvironment } from "./load-release-env";

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

function formatSuccessLine(isolatedTargets: DeployPushTarget[]): string {
  if (isolatedTargets.length === 0) {
    return "[deploy:push] SUCCESS — secrets backup completed, GitHub push verified, and main Vercel production target is READY.";
  }
  if (isolatedTargets.length === 1) {
    return `[deploy:push] SUCCESS — secrets backup completed, GitHub push verified; main and ${isolatedTargets[0]} Vercel production targets are READY.`;
  }
  return `[deploy:push] SUCCESS — secrets backup completed, GitHub push verified; main and ${isolatedTargets.length} selected isolated Vercel production targets are READY.`;
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
  const [isolatedOutcome, mainOutcome] = await Promise.allSettled([
    deploySelectedAccounts({ targets, timestamp, revision: normalizedRevision, runId }),
    verifyMainDeployment({ revision: normalizedRevision, comment: mainComment }),
  ]);
  const reports = isolatedOutcome.status === "fulfilled"
    ? isolatedOutcome.value
    : ((isolatedOutcome.reason as { reports?: VercelDeploymentReport[] }).reports ?? []);
  if (mainOutcome.status === "fulfilled") reports.unshift(mainOutcome.value);
  printFinalSummary(reports);
  const failures = [
    isolatedOutcome.status === "rejected" ? isolatedOutcome.reason : null,
    mainOutcome.status === "rejected" ? mainOutcome.reason : null,
  ].filter(Boolean);
  if (mainOutcome.status === "fulfilled" && mainOutcome.value.state !== "READY") {
    failures.push(new Error(`main deployment is ${mainOutcome.value.state}: ${mainOutcome.value.message}`));
  }
  if (failures.length > 0) {
    const reportDetails = reports.filter((report) => report.state !== "READY").map((report) => [
      `target=${report.target}`,
      `account=${report.account}`,
      `project=${report.project}`,
      `state=${report.state}`,
      report.errorCode ? `code=${report.errorCode}` : null,
      `message=${report.message}`,
      report.url ? `url=${report.url}` : null,
    ].filter(Boolean).join(", "));
    throw new Error([
      ...failures.map((error) => error instanceof Error ? error.message : String(error)),
      ...reportDetails,
    ].join("\n"));
  }
  console.log(`[deploy:revision] SUCCESS — main and ${targets.length} isolated Vercel targets are READY at ${normalizedRevision.slice(0, 12)}.`);
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

  const [isolatedOutcome, mainOutcome] = await Promise.allSettled([
    deploySelectedAccounts({ targets: isolatedTargets, timestamp, revision, runId }),
    verifyMainDeployment({ revision, comment: mainComment }),
  ]);
  const reports: VercelDeploymentReport[] =
    isolatedOutcome.status === "fulfilled"
      ? isolatedOutcome.value
      : ((isolatedOutcome.reason as { reports?: VercelDeploymentReport[] }).reports ?? []);

  if (isolatedOutcome.status === "rejected" || mainOutcome.status === "rejected") {
    if (mainOutcome.status === "fulfilled") reports.unshift(mainOutcome.value);
    if (reports.length > 0) printFinalSummary(reports);
    const isolatedMessage =
      isolatedOutcome.status === "rejected"
        ? (isolatedOutcome.reason instanceof Error ? isolatedOutcome.reason.message : String(isolatedOutcome.reason))
        : undefined;
    const mainMessage =
      mainOutcome.status === "rejected"
        ? (mainOutcome.reason instanceof Error ? mainOutcome.reason.message : String(mainOutcome.reason))
        : undefined;
    fail([isolatedMessage, mainMessage].filter(Boolean).join(" | "), revision);
    return;
  }

  const mainReport = mainOutcome.value;

  reports.unshift(mainReport);
  if (mainReport.state !== "READY") {
    printFinalSummary(reports);
    fail(`main deployment is ${mainReport.state}: ${mainReport.message}`, revision);
    return;
  }

  printFinalSummary(reports);
  console.log(formatSuccessLine(isolatedTargets));
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
