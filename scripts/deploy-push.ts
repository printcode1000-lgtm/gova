import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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
import {
  assertNoReleaseScratchFiles,
  assertReleaseMainBranch,
  clearStaleReleaseGitIndexLock,
  pushMainBranch,
  RELEASE_SCRATCH_FILE_PATTERNS,
  releaseChangedPaths,
  releaseGit,
} from "@asol/release-core";
import {
  type VercelDeploymentReport,
  verifyAccountTokenAccess,
} from "@asol/vercel-deploy-core";
import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";
import { ensureReleaseSecretsRestored } from "./ensure-release-secrets-restored";
import { protectedDocumentationCommitArgs } from "./deployment-commit-trailer";
import { loadReleaseEnvironment } from "./load-release-env";
import {
  publishReleaseReadiness,
  retractReleaseReadiness,
} from "./release-readiness-publish";
import {
  parseReleaseReadinessResponse,
  releaseReadinessUrl,
} from "./release-readiness-barrier";
import {
  captureReleaseRollbackBaseline,
  rollbackReleaseBaseline,
} from "./release-rollback-baseline";

loadReleaseEnvironment();

const ROOT = process.cwd();
const MAIN_BRANCH = "main";
const ROOT_VERCEL_LINK = path.join(ROOT, ".vercel", "project.json");
const FAIL_PREFIX = "[deploy:push] FAILED —";
const RELEASE_MANIFEST = "public/asol-web-manifest.json";

interface DeployPushFlags {
  allowEmpty: boolean;
  allowManifestDowngrade: boolean;
  allowScratchFiles: boolean;
  /** Publish with nothing between the commit and Vercel. See `--fast`. */
  fast: boolean;
}

interface ParsedArgv {
  flags: DeployPushFlags;
  targetArgs: string[];
}

const DEPLOY_PUSH_FLAG_NAMES = new Set([
  "--allow-empty",
  "--allow-manifest-downgrade",
  "--allow-scratch-files",
  "--fast",
]);

const SCRATCH_FILE_PATTERNS = RELEASE_SCRATCH_FILE_PATTERNS;

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

const git = (args: string[]): string => releaseGit(ROOT, args);

function githubRepositoryFromRemote(remoteUrl: string): string | null {
  const match = /github\.com(?::|\/)([^/:\s]+)\/([^/\s]+?)(?:\.git)?$/i.exec(remoteUrl.trim());
  if (!match) return null;
  return `${match[1]}/${match[2]!.replace(/\.git$/i, "")}`;
}

function resolveGitHubRepository(): string | null {
  const configured = process.env.GITHUB_REPOSITORY?.trim();
  if (configured && /^[^/\s]+\/[^/\s]+$/.test(configured)) return configured;
  try {
    return githubRepositoryFromRemote(git(["remote", "get-url", "origin"]));
  } catch {
    return null;
  }
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function assertMainGitDeploymentNotRejected(
  revision: string,
  options: {
    repository?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    pollIntervalMs?: number;
  } = {},
): Promise<void> {
  const repository = options.repository ?? resolveGitHubRepository();
  if (!repository) {
    console.warn("[deploy:push] GitHub repository could not be resolved; exact-SHA Vercel verification remains the fallback.");
    return;
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 12_000;
  const pollIntervalMs = options.pollIntervalMs ?? 1_000;
  const startedAt = Date.now();

  for (;;) {
    const response = await fetchImpl(
      `https://api.github.com/repos/${repository}/commits/${revision}/status`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "gova-release-gate",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      console.warn(
        `[deploy:push] GitHub commit-status lookup returned ${response.status}; exact-SHA Vercel verification remains the fallback.`,
      );
      return;
    }
    const body = (await response.json()) as {
      statuses?: Array<{
        context?: string;
        state?: string;
        description?: string;
        target_url?: string;
      }>;
    };
    const vercel = body.statuses?.find((status) => status.context === "Vercel");
    if (vercel) {
      const state = vercel.state?.toLowerCase() ?? "";
      if (state === "failure" || state === "error") {
        const description = vercel.description?.trim() || "Vercel reported a failed commit status";
        const targetUrl = vercel.target_url?.trim();
        const rateLimited = /rate[ -]?limit|build-rate-limit/i.test(`${description} ${targetUrl ?? ""}`);
        throw new Error(
          `Vercel rejected the main Git deployment before any production runtime was changed: ${description}` +
            (rateLimited
              ? " The Vercel deployment/build rate limit is active; retry after it resets or upgrade the Vercel plan."
              : "") +
            (targetUrl ? ` (${targetUrl})` : ""),
        );
      }
      console.log(
        `[deploy:push] Vercel Git status for ${revision.slice(0, 12)} is ${state || "present"}; release mutation may start.`,
      );
      return;
    }
    if (Date.now() - startedAt >= timeoutMs) break;
    await wait(pollIntervalMs);
  }

  console.log(
    `[deploy:push] No immediate Vercel Git rejection appeared for ${revision.slice(0, 12)}; continuing to exact-SHA deployment verification.`,
  );
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


/**
 * Bring `HEAD` up to `origin/main` before the deployment commit is written.
 *
 * Without this the run pays for the whole readiness sequence and then loses the
 * push to a non-fast-forward, because `origin/main` moved while it worked. The
 * fast-forward is deliberately the only automatic case: a dirty tree plus a
 * rebase is how uncommitted work disappears, and a diverged local `main` is a
 * decision for the operator, not for a deploy script.
 *
 * `--ff-only` keeps the uncommitted tree intact and refuses loudly when an
 * incoming change would overwrite a modified file, which is exactly the moment
 * the run must stop rather than commit a half-merged source.
 */
function advanceToOriginMain(): void {
  try {
    execFileSync("git", ["fetch", "origin", MAIN_BRANCH], { cwd: ROOT, stdio: "inherit" });
  } catch {
    console.log(
      `[deploy:push] Could not fetch origin/${MAIN_BRANCH}; continuing with the local ref.`,
    );
    return;
  }

  let remoteHead = "";
  try {
    remoteHead = git(["rev-parse", `origin/${MAIN_BRANCH}`]);
  } catch {
    return; // No remote ref locally; let the push decide.
  }

  const localHead = git(["rev-parse", "HEAD"]);
  if (localHead === remoteHead) return;

  const behind = isAncestor(localHead, remoteHead);
  if (!behind) {
    if (isAncestor(remoteHead, localHead)) return; // Local is ahead: normal.
    throw new Error(
      `Local ${MAIN_BRANCH} and origin/${MAIN_BRANCH} have diverged. ` +
        "Reconcile them yourself before publishing; deploy:push will not rebase over an uncommitted tree.",
    );
  }

  console.log(
    `[deploy:push] Fast-forwarding ${MAIN_BRANCH} to origin/${MAIN_BRANCH} (${remoteHead.slice(0, 12)})...`,
  );
  try {
    execFileSync("git", ["merge", "--ff-only", `origin/${MAIN_BRANCH}`], {
      cwd: ROOT,
      stdio: "inherit",
    });
  } catch {
    throw new Error(
      `Could not fast-forward to origin/${MAIN_BRANCH}: an incoming change would overwrite an uncommitted file. ` +
        "Commit or stash that file and run deploy:push again.",
    );
  }
}

function isAncestor(candidate: string, descendant: string): boolean {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", candidate, descendant], {
      cwd: ROOT,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function assertMainDeploymentCredentials(): void {
  if (!process.env.VERCEL_TOKEN?.trim()) {
    throw new Error(
      "VERCEL_TOKEN is required to verify the main Vercel deployment. Set it before running deploy:push.",
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
      fast: argv.includes("--fast"),
    },
    targetArgs: argv.filter((arg) => arg.startsWith("--vercel-target=")),
  };
}

function changedPaths(): string[] {
  return releaseChangedPaths(ROOT);
}

function assertNoScratchFiles(flags: DeployPushFlags): void {
  assertNoReleaseScratchFiles({ cwd: ROOT, allowScratchFiles: flags.allowScratchFiles });
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

/**
 * A retracted readiness is permanent for its revision.  Reusing that SHA would
 * deploy all backends again only for the gova build to fail with
 * `releaseReadinessFailed`, then roll the release back.  A new release commit
 * is required instead.
 *
 * This runs even for `--fast`: the check is a single control-plane read and the
 * failure is otherwise unrecoverable after production mutations begin.
 */
async function assertReusableRevisionNotRetracted(
  revision: string,
  options: { fetchImpl?: typeof fetch; controlOrigin?: string } = {},
): Promise<void> {
  const controlOrigin = options.controlOrigin ?? process.env.NEXT_PUBLIC_ASOL_CONTROL_URL?.trim();
  if (!controlOrigin) {
    throw new Error(
      "Cannot verify whether the reusable revision was retracted: NEXT_PUBLIC_ASOL_CONTROL_URL is missing. " +
        "Refusing to reuse HEAD; pass --allow-empty after restoring the release environment.",
    );
  }
  const response = await (options.fetchImpl ?? fetch)(releaseReadinessUrl(controlOrigin, revision), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Cannot verify whether reusable revision ${revision.slice(0, 12)} was retracted: control returned HTTP ${response.status}. ` +
        "Refusing to reuse HEAD; pass --allow-empty after control is reachable.",
    );
  }
  const status = parseReleaseReadinessResponse(revision, await response.json());
  if (status === "failed") {
    throw new Error(
      `Reusable revision ${revision.slice(0, 12)} has permanently failed release readiness. ` +
        "Refusing to repeat a release that will fail with releaseReadinessFailed; pass --allow-empty to create a new deployment SHA.",
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

/**
 * What runs before the commit.
 *
 * `--fast` keeps only the checks that cost nothing and cannot be recovered from
 * afterwards — the branch, and the credentials without which the run cannot
 * deploy at all — and drops everything that costs wall-clock time: the Vercel
 * token round trip, the scratch/manifest/non-empty refusals, the mirror builds
 * and (in `main`) the secrets backup. What remains is the push and the Vercel
 * wait, which is the whole point of the flag.
 *
 * The trade is explicit: a type error inside a service mirror is invisible to
 * the root `typecheck`, so `--fast` moves that failure from two minutes locally
 * to a failed deployment after `main` has already moved. The release
 * transaction still rolls the accounts back, so production does not stay broken
 * — the cost is a wasted publish cycle, not an outage. Use it when the
 * correctness gates already ran, which is exactly what `deploy:push` assumes of
 * its caller in the first place.
 *
 * Without `--fast` every gate below runs. That is the whole difference between
 * the two commands: they publish through the same transaction, and neither runs
 * `deploy:all`'s correctness preflight (lint, typecheck, tests, builds).
 */
async function assertFastPublishReadiness(
  targets: readonly DeployPushTarget[],
  flags: DeployPushFlags,
): Promise<void> {
  assertReleaseMainBranch(ROOT, "deploy:push");
  await ensureReleaseSecretsRestored("deploy:push");
  assertMainDeploymentCredentials();
  if (flags.fast) {
    console.log(
      "[deploy:push] --fast: skipping Vercel account access, publish refusals, and mirror builds.",
    );
    return;
  }
  await assertVercelAccountsForTargets(targets);
  assertNoScratchFiles(flags);
  assertReleaseManifestNotDowngraded(flags);
  assertSomethingToPush(flags);
  await assertServiceMirrorsBuild();
}

/**
 * The mirrors must compile before they are uploaded.
 *
 * `deploy:push` skips the correctness gates on purpose — they are the caller's
 * job — but a mirror that does not build is not a correctness question, it is a
 * deployment that will fail after the push. And it fails *remotely*: the root
 * `typecheck` covers `src/` and the packages, not the service trees, so a type
 * error inside a mirror is invisible locally and surfaces as
 * `Command "npm run build" exited with 1` on Vercel, after `main` already moved.
 *
 * That is exactly what happened to `ActionInput`: exported from one module,
 * imported from another, green everywhere except the deployment.
 *
 * `services:sync` first, because a mirror built from stale sources proves
 * nothing about the sources being pushed.
 */
async function assertServiceMirrorsBuild(): Promise<void> {
  await runDeploymentNpmScript("services:sync", { logPrefix: "deploy:push" });
  await runDeploymentNpmScript("services:build", { logPrefix: "deploy:push" });
  await runDeploymentNpmScript("control:build", { logPrefix: "deploy:push" });
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

/**
 * `--fast` skips `secrets:backup`, so the success line must not claim it.
 *
 * A final line is the only thing most operators read. One that names a step the
 * run deliberately skipped teaches the wrong recovery: it says an encrypted
 * archive of the current secrets exists when none was written.
 */
function formatSuccessLine(secretsBackedUp: boolean): string {
  return (
    "[deploy:push] SUCCESS — " +
    (secretsBackedUp ? "secrets backup completed, " : "secrets backup skipped (--fast), ") +
    "GitHub push verified; " +
    `control, ${ALL_DEPLOY_PUSH_TARGETS.length} isolated Vercel production targets, ` +
    "and main are READY, and exact-SHA release readiness is published."
  );
}

async function deployMainRuntime(input: {
  revision: string;
  comment: string;
}): Promise<VercelDeploymentReport> {
  const report = await runDeploymentNpmScript("main:deploy", {
    logPrefix: "deploy:push",
    captureReport: true,
    env: {
      ASOL_DEPLOYMENT_RUN_ID: `main-${input.revision.slice(0, 12)}`,
      ASOL_DEPLOYMENT_REVISION: input.revision,
      ASOL_DEPLOYMENT_COMMENT: input.comment,
    },
  });
  if (!report) throw new Error("main:deploy returned no deployment report.");
  return report;
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
  readonly command: "deploy:push";
  readonly sandboxName: string;
  readonly initiatedByUid: string;
}): Promise<VercelDeploymentReport[]> {
  const targets = [...ALL_DEPLOY_PUSH_TARGETS];

  // Captured before the first production mutation so every later failure can
  // re-promote what was live instead of pausing for instructions.
  const baselines = await captureReleaseRollbackBaseline(input.logPrefix);

  const reports: VercelDeploymentReport[] = [];
  let readinessPublished = false;
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

    // Only now may the explicit gova deploy publish: all owned backends are READY.
    readinessPublished = true;
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
    const mainReport = await deployMainRuntime({
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

    // Withdraw the readiness before rolling anything back. It is what unblocks
    // the gova build, and a build that arrives after the rollback would publish
    // a frontend over backends this failure path has just reverted.
    if (readinessPublished) {
      await retractReleaseReadiness({
        revision: input.revision,
        runId: input.runId,
        reason: error instanceof Error ? error.message : String(error),
        logPrefix: input.logPrefix,
      });
    }

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
  githubRepositoryFromRemote,
  assertMainGitDeploymentNotRejected,
  assertReusableRevisionNotRetracted,
};

async function main(): Promise<void> {
  const { flags, targetArgs } = parseArgv(process.argv.slice(2));
  const isolatedTargets = await resolveServiceDeployTargets(targetArgs);

  // Publishing is all-or-nothing: control, all six workloads, readiness and
  // main, or no push at all. A partial selection is refused rather than
  // diverted: the old maintenance path deployed the named accounts from the
  // current HEAD, and because it wrote no git it never checked the branch —
  // the one route by which a publish could reach Vercel from something other
  // than `main`. Deploy one account with its own `*:deploy` script instead.
  if (isolatedTargets.length !== ALL_DEPLOY_PUSH_TARGETS.length) {
    fail(
      "deploy:push publishes the complete set (control + six workloads + main). " +
        `Selected: ${isolatedTargets.join(", ") || "(none)"}. ` +
        "There is no partial-target deploy; use the account's own deploy script for maintenance.",
    );
    return;
  }

  await assertFastPublishReadiness(isolatedTargets, flags);

  let secretsBackedUp = false;
  if (flags.fast) {
    console.log("[deploy:push] --fast: skipping secrets:backup.");
  } else {
    try {
      await runDeploymentNpmScript("secrets:backup", { logPrefix: "deploy:push" });
      secretsBackedUp = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      fail(`secrets:backup did not complete: ${message}`);
      return;
    }
  }

  clearStaleReleaseGitIndexLock({ cwd: ROOT, command: "deploy:push", onRemoved: (ageSeconds) => console.log(`[deploy:push] Removed abandoned .git/index.lock (${ageSeconds} seconds old).`) });

  try {
    advanceToOriginMain();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return;
  }

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
      await assertReusableRevisionNotRetracted(git(["rev-parse", "HEAD"]));
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
  console.log(formatSuccessLine(secretsBackedUp));
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
