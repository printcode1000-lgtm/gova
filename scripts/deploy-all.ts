import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEPLOY_ALL_PHASE_ORDER,
  type DeployAllPhaseId,
  type DeployAllServicePhaseId,
  formatPhaseList,
  isDeployAllPhaseId,
  phasesFrom,
  phasePrerequisites,
  SERVICE_PHASE_IDS,
} from "./lib/deploy-all-phases";
import {
  assertPhasePrerequisites,
  markPhaseComplete,
  readDeployAllState,
  writeDeployAllState,
} from "./lib/deploy-all-state";
import {
  DeploymentNpmScriptError,
  runDeploymentNpmScript,
} from "./lib/run-deployment-npm-script";
import {
  type VercelDeploymentReport,
  waitForVercelProductionDeployment,
} from "./lib/vercel-deployment-monitor";
import { pushMainBranch } from "./lib/push-main-branch";
import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";
import {
  inspectNativeCompatibility,
  resolveNativeBaseline,
} from "@asol/ota-core/publishing";
import { loadReleaseEnvironment } from "./load-release-env";

loadReleaseEnvironment();

const ROOT = process.cwd();
const MAIN_BRANCH = "main";
const GIT_INDEX_LOCK = path.join(ROOT, ".git", "index.lock");
const ROOT_VERCEL_LINK = path.join(ROOT, ".vercel", "project.json");
const STALE_GIT_LOCK_AGE_MS = 2 * 60 * 1000;
const FAIL_PREFIX = "[deploy:all] FAILED —";
const SERVICES_PHASE_ALIAS = "services";

const SERVICE_DEPLOYS: Readonly<
  Record<DeployAllServicePhaseId, { target: DeployAllServicePhaseId; script: string }>
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

function assertMainBranch(): void {
  const branch = git(["branch", "--show-current"]);
  if (branch !== MAIN_BRANCH) {
    throw new Error(
      `deploy:all must run from ${MAIN_BRANCH}; current branch is ${branch || "detached HEAD"}.`,
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

/** Remove only an abandoned Git lock; a fresh or actively owned lock stops deployment. */
function clearStaleGitIndexLock(): void {
  if (!existsSync(GIT_INDEX_LOCK)) return;
  const ageMs = Date.now() - statSync(GIT_INDEX_LOCK).mtimeMs;
  if (ageMs < STALE_GIT_LOCK_AGE_MS || hasRunningGitProcess()) {
    throw new Error(
      "Git index.lock is active. Close the other Git operation and run deploy:all again.",
    );
  }
  unlinkSync(GIT_INDEX_LOCK);
  console.log(
    `[deploy:all] Removed abandoned .git/index.lock (${Math.round(ageMs / 1000)} seconds old).`,
  );
}

function failedReport(
  target: string,
  comment: string,
  message: string,
): VercelDeploymentReport {
  const project =
    target === "main"
      ? "gova"
      : (ACCOUNT_DECLARATIONS[target]?.project ?? `asol-${target}`);
  return {
    target,
    project,
    account: "unknown",
    comment,
    state: "ERROR",
    message,
    verifiedAt: new Date().toISOString(),
  };
}

function printFinalSummary(reports: VercelDeploymentReport[]): void {
  if (reports.length === 0) return;
  console.log("\n[deploy:all] Final verified production report");
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

interface DeployFlags {
  skipPreflight: boolean;
  allowEmpty: boolean;
  allowManifestDowngrade: boolean;
  allowScratchFiles: boolean;
}

interface PhaseSelection {
  listPhases: boolean;
  onlyPhase?: DeployAllPhaseId | typeof SERVICES_PHASE_ALIAS;
  fromPhase?: DeployAllPhaseId;
  revisionOverride?: string;
}

interface ParsedArgv {
  flags: DeployFlags;
  phase: PhaseSelection;
}

const DEPLOY_FLAG_NAMES = new Set([
  "--skip-preflight",
  "--allow-empty",
  "--allow-manifest-downgrade",
  "--allow-scratch-files",
]);

function parseFlags(argv: readonly string[]): DeployFlags {
  const unknown = argv.filter(
    (arg) => !DEPLOY_FLAG_NAMES.has(arg) && !arg.startsWith("--phase=") && !arg.startsWith("--from-phase=") && !arg.startsWith("--revision=") && arg !== "--list-phases",
  );
  if (unknown.length > 0) {
    throw new Error(
      `Unknown option(s): ${unknown.join(", ")}. Known deploy flags: ${[...DEPLOY_FLAG_NAMES].join(", ")}; phase flags: --phase=<id>, --from-phase=<id>, --revision=<sha>, --list-phases.`,
    );
  }
  return {
    skipPreflight: argv.includes("--skip-preflight"),
    allowEmpty: argv.includes("--allow-empty"),
    allowManifestDowngrade: argv.includes("--allow-manifest-downgrade"),
    allowScratchFiles: argv.includes("--allow-scratch-files"),
  };
}

function parsePhaseArg(argv: readonly string[], prefix: "--phase=" | "--from-phase="): string | undefined {
  const entry = argv.find((arg) => arg.startsWith(prefix));
  return entry?.slice(prefix.length);
}

function parseRevisionArg(argv: readonly string[]): string | undefined {
  const entry = argv.find((arg) => arg.startsWith("--revision="));
  return entry?.slice("--revision=".length);
}

function parseArgv(argv: readonly string[]): ParsedArgv {
  const flags = parseFlags(argv);
  const revisionOverride = parseRevisionArg(argv);
  if (argv.includes("--list-phases")) {
    return { flags, phase: { listPhases: true } };
  }

  const onlyPhaseRaw = parsePhaseArg(argv, "--phase=");
  const fromPhaseRaw = parsePhaseArg(argv, "--from-phase=");
  if (onlyPhaseRaw && fromPhaseRaw) {
    throw new Error("Use either --phase=<id> or --from-phase=<id>, not both.");
  }

  if (onlyPhaseRaw) {
    if (onlyPhaseRaw === SERVICES_PHASE_ALIAS) {
      return {
        flags,
        phase: { listPhases: false, onlyPhase: SERVICES_PHASE_ALIAS, revisionOverride },
      };
    }
    if (!isDeployAllPhaseId(onlyPhaseRaw)) {
      throw new Error(
        `Unknown phase "${onlyPhaseRaw}". Run with --list-phases to see valid phase ids.`,
      );
    }
    return {
      flags,
      phase: { listPhases: false, onlyPhase: onlyPhaseRaw, revisionOverride },
    };
  }

  if (fromPhaseRaw) {
    if (!isDeployAllPhaseId(fromPhaseRaw)) {
      throw new Error(
        `Unknown phase "${fromPhaseRaw}". Run with --list-phases to see valid phase ids.`,
      );
    }
    return {
      flags,
      phase: { listPhases: false, fromPhase: fromPhaseRaw, revisionOverride },
    };
  }

  return {
    flags,
    phase: {
      listPhases: false,
      revisionOverride,
    },
  };
}

function resolvePhasesToRun(selection: PhaseSelection): DeployAllPhaseId[] {
  if (selection.onlyPhase === SERVICES_PHASE_ALIAS) {
    return [...SERVICE_PHASE_IDS];
  }
  if (selection.onlyPhase) {
    return [selection.onlyPhase];
  }
  if (selection.fromPhase) {
    return phasesFrom(selection.fromPhase);
  }
  return [...DEPLOY_ALL_PHASE_ORDER];
}

function requiredPrerequisites(
  phaseId: DeployAllPhaseId,
  flags: DeployFlags,
): DeployAllPhaseId[] {
  const required = phasePrerequisites(phaseId);
  if (flags.skipPreflight) {
    return required.filter((id) => id !== "preflight");
  }
  return required;
}

function printPhaseRetryHint(failedPhase: DeployAllPhaseId): void {
  console.error(
    `\n[deploy:all] Fix the failure, then retry only this phase:\n` +
      `  npm run deploy:all -- --phase=${failedPhase}\n` +
      `Or continue from here:\n` +
      `  npm run deploy:all -- --from-phase=${failedPhase}`,
  );
}

/**
 * Every check that must pass before source becomes public.
 *
 * `build:static` is included deliberately: it is the release build, and it also
 * runs `architecture:check` and the test suites. Discovering a broken build
 * here costs minutes; discovering it after the push costs a failed production
 * deployment on a commit that is already on `main`.
 */
const PREFLIGHT_STEPS = [
  "lint",
  "typecheck",
  "architecture:check",
  "test",
  // Apply local migrations to every SQLite source, refresh profile/order shards,
  // then push DDL to every Turso database before any release build or git write.
  // Without this gate, code that expects new columns can reach production first.
  "db:ensure",
  "db:schema:sync:release",
  "build:static",
  // The shared code now lives in sealed packages, so what each service uploads is decided by
  // a graph walker rather than by a folder. A specifier the walker cannot see is never copied,
  // and nothing below notices: the remote build resolves lazily and succeeds, then the first
  // request fails with "Cannot find module". This step re-reads each upload and resolves every
  // edge inside it — the only check between "the mirror was written" and "the mirror is whole".
  "services:verify",
  // Added after every one of these passed and all four service accounts still failed
  // their remote build. Each service is uploaded alone and installed against its own
  // `package.json`; nothing above exercises that. This is the only step that builds a
  // service the way Vercel does.
  "services:build",
] as const;

async function runPreflightPhase(flags: DeployFlags): Promise<void> {
  if (flags.skipPreflight) {
    console.warn(
      "\n[deploy:all] ⚠ PREFLIGHT SKIPPED. Not verified before publishing:\n" +
        PREFLIGHT_STEPS.map((step) => `  - npm run ${step}`).join("\n") +
        "\n[deploy:all] ⚠ The deployment commit will record that these were skipped.\n",
    );
    return;
  }

  console.log(
    `[deploy:all] Preflight: ${PREFLIGHT_STEPS.map((step) => `npm run ${step}`).join(", ")}`,
  );
  for (const step of PREFLIGHT_STEPS) {
    try {
      await runDeploymentNpmScript(step, { logPrefix: "deploy:all" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Preflight failed at "${step}": ${message}\n` +
          "Nothing has been committed or pushed. Fix the failure and retry:\n" +
          "  npm run deploy:all -- --phase=preflight",
      );
    }
  }
  console.log("[deploy:all] Preflight passed; safe to publish.");
}

/**
 * Credentials are checked up front.
 *
 * `verifyMainDeployment` needs both of these, but it runs last — after the push
 * and after four service deployments. A missing token discovered there leaves a
 * published commit that was never verified.
 */
function assertDeploymentCredentials(): void {
  if (!process.env.VERCEL_TOKEN?.trim()) {
    throw new Error(
      "VERCEL_TOKEN is required to verify the production deployment. Set it before running deploy:all.",
    );
  }
  if (!existsSync(ROOT_VERCEL_LINK)) {
    throw new Error(
      ".vercel/project.json is required to identify the GitHub-linked main project.",
    );
  }
}

const SCRATCH_FILE_PATTERNS = [
  /(^|\/)__probe/i,
  /\.(log|tmp|bak|orig|rej)$/i,
  /(^|\/)scratchpad\//i,
  /(^|\/)\.DS_Store$/,
];

/**
 * `git add -A` stages whatever is in the tree, so the tree is reviewed first.
 * A stray probe or log file would otherwise be published to `main`.
 */
function assertNoScratchFiles(flags: DeployFlags): void {
  const status = git(["status", "--porcelain"]);
  const paths = status
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim());

  console.log(`[deploy:all] ${paths.length} path(s) will be included in the deployment commit.`);

  const scratch = paths.filter((entry) =>
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

const RELEASE_MANIFEST = "public/asol-web-manifest.json";

/**
 * `build:static` rewrites the release manifest from `package.json` unless the
 * release environment variables are set, which downgrades `releaseId`,
 * `version`, and `minimumNativeVersion`. Publishing that would tell installed
 * shells an older release is current.
 */
function assertReleaseManifestNotDowngraded(flags: DeployFlags): void {
  const manifestPath = path.join(ROOT, RELEASE_MANIFEST);
  if (!existsSync(manifestPath)) return;

  let committed: Record<string, unknown>;
  let current: Record<string, unknown>;
  try {
    committed = JSON.parse(git(["show", `HEAD:${RELEASE_MANIFEST}`]));
    current = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    // No committed manifest to compare against, or unreadable JSON: the build
    // itself will fail on a malformed manifest, so nothing is asserted here.
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
        "This is what a verification-only `build:static` does when the release env vars are unset.\n" +
        `Restore it with: git checkout -- ${RELEASE_MANIFEST}\n` +
        "Or pass --allow-manifest-downgrade if the downgrade is intended.",
    );
  }
}

/** Numeric-segment comparison; non-numeric suffixes fall back to string order. */
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

/**
 * An empty run would still create a commit and trigger a production build.
 * That is occasionally wanted, but it must be asked for.
 */
function assertSomethingToDeploy(flags: DeployFlags): void {
  if (flags.allowEmpty) return;
  if (git(["status", "--porcelain"])) return;

  let remoteHead = "";
  try {
    remoteHead = git(["rev-parse", `origin/${MAIN_BRANCH}`]);
  } catch {
    return; // No remote ref locally; let the push decide.
  }
  if (remoteHead === git(["rev-parse", "HEAD"])) {
    throw new Error(
      `Nothing to deploy: the working tree is clean and HEAD already matches origin/${MAIN_BRANCH}.\n` +
        "Pass --allow-empty to redeploy the current commit anyway.",
    );
  }
}

/** What to run if the push landed but a deployment did not. */
function printRollbackGuidance(revision: string): void {
  console.error(
    "\n[deploy:all] The commit is already on GitHub. To roll back:\n" +
      `  git revert ${revision}\n` +
      `  git push origin ${MAIN_BRANCH}\n` +
      "Or promote the previous production deployment from the Vercel dashboard.",
  );
}

function formatSuccessLine(skipPreflight: boolean): string {
  const preflight = skipPreflight ? "preflight skipped" : "preflight passed";
  return `[deploy:all] SUCCESS — ${preflight}, secrets backup completed, GitHub push completed, and all 7 Vercel production targets are READY.`;
}

function fail(message: string, revision?: string): void {
  if (revision) printRollbackGuidance(revision);
  console.error(`${FAIL_PREFIX} ${message}`);
  process.exitCode = 1;
}

async function verifyMainDeployment(input: {
  revision: string;
  comment: string;
}): Promise<VercelDeploymentReport> {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) throw new Error("VERCEL_TOKEN is required to verify the GitHub-linked main deployment.");
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

interface PublishContext {
  revision: string;
  runId: string;
  timestamp: string;
  mainComment: string;
}

function resolvePublishContext(
  selection: PhaseSelection,
  existing?: ReturnType<typeof readDeployAllState>,
): PublishContext {
  const revision =
    selection.revisionOverride?.trim() ||
    existing?.revision?.trim() ||
    git(["rev-parse", "HEAD"]);
  const timestamp = existing?.timestamp || new Date().toISOString();
  const mainComment = existing?.mainComment || `deploy(main): ${timestamp}`;
  const runId =
    existing?.runId ||
    `${timestamp.replace(/[^0-9]/g, "").slice(0, 17)}-${revision.slice(0, 12)}`;
  return { revision, runId, timestamp, mainComment };
}

async function runPublishPhase(flags: DeployFlags): Promise<PublishContext> {
  assertMainBranch();
  assertDeploymentCredentials();
  assertNoScratchFiles(flags);
  assertReleaseManifestNotDowngraded(flags);
  assertSomethingToDeploy(flags);

  console.log("[deploy:all] Creating or verifying the encrypted secrets backup...");
  await runDeploymentNpmScript("secrets:backup", { logPrefix: "deploy:all" });

  clearStaleGitIndexLock();

  const timestamp = new Date().toISOString();
  const mainComment = `deploy(main): ${timestamp}`;
  console.log(`[deploy:all] Creating deployment commit: ${mainComment}`);
  execFileSync("git", ["add", "-A"], { cwd: ROOT, stdio: "inherit" });
  const commitArgs = ["commit", "--allow-empty", "-m", mainComment];
  if (flags.skipPreflight) {
    commitArgs.push(
      "-m",
      `Preflight skipped via --skip-preflight. Not verified: ${PREFLIGHT_STEPS.join(", ")}.`,
    );
  }
  execFileSync("git", commitArgs, {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (git(["status", "--porcelain"])) {
    throw new Error(
      "The working tree changed while creating the deployment commit; refusing to push inconsistent source.",
    );
  }

  const revision = git(["rev-parse", "HEAD"]);
  const runId = `${timestamp.replace(/[^0-9]/g, "").slice(0, 17)}-${revision.slice(0, 12)}`;
  console.log("[deploy:all] Pushing main to GitHub...");
  pushMainBranch(ROOT, MAIN_BRANCH, "deploy:all");
  console.log(
    "[deploy:all] GitHub push completed; only the existing GitHub-linked main Vercel project will auto-deploy.",
  );

  writeDeployAllState({
    revision,
    runId,
    timestamp,
    mainComment,
    skipPreflight: flags.skipPreflight,
    completedPhases: readDeployAllState()?.completedPhases ?? [],
    lastUpdated: new Date().toISOString(),
  });

  return { revision, runId, timestamp, mainComment };
}

async function runServicePhase(
  phaseId: DeployAllServicePhaseId,
  context: PublishContext,
): Promise<VercelDeploymentReport> {
  const deployment = SERVICE_DEPLOYS[phaseId];
  const comment = `deploy(${deployment.target}): ${context.timestamp} @ ${context.revision.slice(0, 12)}`;
  const report = await runDeploymentNpmScript(deployment.script, {
    logPrefix: "deploy:all",
    captureReport: true,
    env: {
      ASOL_DEPLOYMENT_RUN_ID: `${context.runId}-${deployment.target}`,
      ASOL_DEPLOYMENT_REVISION: context.revision,
      ASOL_DEPLOYMENT_COMMENT: comment,
    },
  });
  if (!report) throw new Error("The service returned no deployment report.");
  if (report.state !== "READY") {
    throw new Error(report.message || `Service ${deployment.target} is ${report.state}.`);
  }
  return report;
}

async function main(): Promise<void> {
  const { flags, phase } = parseArgv(process.argv.slice(2));

  if (phase.listPhases) {
    console.log("[deploy:all] Phases (in order):\n" + formatPhaseList());
    console.log(
      "\nAliases:\n" +
        `  --phase=${SERVICES_PHASE_ALIAS}  all six CLI service deploys\n` +
        "\nExamples:\n" +
        "  npm run deploy:all -- --phase=preflight\n" +
        "  npm run deploy:all -- --phase=publish\n" +
        "  npm run deploy:all -- --phase=submain\n" +
        "  npm run deploy:all -- --from-phase=notifications\n",
    );
    return;
  }

  const phasesToRun = resolvePhasesToRun(phase);
  const runningFullRelease =
    phasesToRun.length === DEPLOY_ALL_PHASE_ORDER.length &&
    phasesToRun.every((id, index) => id === DEPLOY_ALL_PHASE_ORDER[index]);

  let publishContext = resolvePublishContext(phase, readDeployAllState());
  const reports: VercelDeploymentReport[] = [];

  for (const phaseId of phasesToRun) {
    console.log(`\n[deploy:all] ── phase: ${phaseId} ──`);
    try {
      if (phaseId === "preflight") {
        assertMainBranch();
        assertDeploymentCredentials();
        await runPreflightPhase(flags);
        markPhaseComplete("preflight", { skipPreflight: flags.skipPreflight });
        continue;
      }

      const prerequisites = requiredPrerequisites(phaseId, flags);
      if (prerequisites.length > 0) {
        assertPhasePrerequisites(phaseId, prerequisites);
      }

      if (phaseId === "publish") {
        publishContext = await runPublishPhase(flags);
        markPhaseComplete("publish", publishContext);
        continue;
      }

      if ((SERVICE_PHASE_IDS as readonly string[]).includes(phaseId)) {
        publishContext = resolvePublishContext(phase, readDeployAllState());
        if (!publishContext.revision) {
          throw new Error(
            'Publish phase has not run yet. Run "npm run deploy:all -- --phase=publish" first.',
          );
        }
        const report = await runServicePhase(phaseId as DeployAllServicePhaseId, publishContext);
        reports.push(report);
        markPhaseComplete(phaseId);
        console.log(`[deploy:all] Phase "${phaseId}" completed (${report.state}).`);
        continue;
      }

      if (phaseId === "main") {
        publishContext = resolvePublishContext(phase, readDeployAllState());
        const mainReport = await verifyMainDeployment({
          revision: publishContext.revision,
          comment: publishContext.mainComment,
        });
        reports.unshift(mainReport);
        if (mainReport.state !== "READY") {
          throw new Error(mainReport.message || `Main deployment is ${mainReport.state}.`);
        }
        markPhaseComplete("main");
        console.log(`[deploy:all] Phase "main" completed (${mainReport.state}).`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof DeploymentNpmScriptError && error.report) {
        reports.push(error.report);
      }
      printPhaseRetryHint(phaseId);
      const rollbackRevision =
        phaseId !== "preflight" && phaseId !== "publish" ? publishContext.revision : undefined;
      fail(`phase "${phaseId}" failed — ${message}`, rollbackRevision);
      printFinalSummary(reports);
      return;
    }
  }

  printFinalSummary(reports);
  if (runningFullRelease) {
    reportNativeSurfaceStatus();
    console.log(formatSuccessLine(flags.skipPreflight));
    writeDeployAllState({
      ...publishContext,
      skipPreflight: flags.skipPreflight,
      completedPhases: [...DEPLOY_ALL_PHASE_ORDER],
      lastUpdated: new Date().toISOString(),
    });
    return;
  }

  const completed = readDeployAllState()?.completedPhases ?? [];
  const remaining = DEPLOY_ALL_PHASE_ORDER.filter((id) => !completed.includes(id));
  if (remaining.length > 0) {
    console.log(
      `[deploy:all] Remaining phase(s): ${remaining.join(", ")}\n` +
        `Continue with: npm run deploy:all -- --from-phase=${remaining[0]}`,
    );
  } else {
    console.log("[deploy:all] All phases completed for this run.");
  }
}

/**
 * Whether a store build is still required.
 *
 * `ota:publish` refuses while the native surface has changed since the last
 * store release, so the operator is told here rather than discovering it at the
 * next OTA attempt. Reported only — never re-baselined automatically.
 */
function reportNativeSurfaceStatus(): void {
  try {
    const report = inspectNativeCompatibility(resolveNativeBaseline(), ROOT);
    if (report.baselineMissing) {
      console.log(
        "\n[deploy:all] Native surface: no baseline tag resolved, so OTA compatibility cannot be proven.",
      );
      return;
    }
    if (report.requiresStoreRelease) {
      console.log(
        `\n[deploy:all] Native surface: ${report.changedPaths.length} path(s) and ` +
          `${report.changedNativeDependencies.length} native dependency change(s) since the last store release.\n` +
          "[deploy:all] `ota:publish` will refuse until a store build ships and the baseline is re-tagged.",
      );
      return;
    }
    console.log(
      "\n[deploy:all] Native surface unchanged since the last store release; OTA is available.",
    );
  } catch (error) {
    console.log(
      `\n[deploy:all] Native surface status unavailable: ${error instanceof Error ? error.message : error}`,
    );
  }
}

export const __testables = {
  parseFlags,
  parseArgv,
  resolvePhasesToRun,
  compareVersions,
  SCRATCH_FILE_PATTERNS,
  PREFLIGHT_STEPS,
  RELEASE_MANIFEST,
  formatSuccessLine,
  FAIL_PREFIX,
  DEPLOY_ALL_PHASE_ORDER,
  SERVICES_PHASE_ALIAS,
};

/**
 * Only deploy when this file is the process entrypoint.
 *
 * Without the guard, merely importing the module — as a test does — would
 * commit and push to production.
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
