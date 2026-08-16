import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import {
  type VercelDeploymentReport,
  waitForVercelProductionDeployment,
} from "./lib/vercel-deployment-monitor";
import {
  inspectNativeCompatibility,
  resolveNativeBaseline,
} from "@asol/ota-core/publishing";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const ROOT = process.cwd();
const MAIN_BRANCH = "main";
const GIT_INDEX_LOCK = path.join(ROOT, ".git", "index.lock");
const ROOT_VERCEL_LINK = path.join(ROOT, ".vercel", "project.json");
const STALE_GIT_LOCK_AGE_MS = 2 * 60 * 1000;
const SERVICE_DEPLOYS = [
  { target: "notifications", script: "notifications:deploy" },
  { target: "products", script: "products:deploy" },
  { target: "orders", script: "orders:deploy" },
  { target: "profiles", script: "profiles:deploy" },
] as const;

class DeploymentScriptError extends Error {
  constructor(message: string, readonly report?: VercelDeploymentReport) {
    super(message);
  }
}

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

function parseReport(output: string): VercelDeploymentReport | undefined {
  const lines = output.split(/\r?\n/).reverse();
  const marker = "[ASOL_DEPLOY_REPORT] ";
  const line = lines.find((candidate) => candidate.startsWith(marker));
  if (!line) return undefined;
  try {
    return JSON.parse(line.slice(marker.length)) as VercelDeploymentReport;
  } catch {
    return undefined;
  }
}

function runNpmScript(
  script: string,
  options: { env?: NodeJS.ProcessEnv; captureReport?: boolean } = {},
): Promise<VercelDeploymentReport | undefined> {
  const npmCli = process.env.npm_execpath;
  const command = npmCli
    ? process.execPath
    : process.platform === "win32"
      ? "npm.cmd"
      : "npm";
  const args = npmCli ? [npmCli, "run", script] : ["run", script];
  return new Promise((resolve, reject) => {
    console.log(`\n[deploy:all] Starting ${script}...`);
    const capture = options.captureReport === true;
    let output = "";
    const child: ChildProcess = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...options.env },
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: false,
      windowsHide: true,
    });

    if (capture) {
      child.stdout?.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        output += text;
        process.stdout.write(text);
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        process.stderr.write(chunk);
      });
    }

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      const report = parseReport(output);
      if (code === 0 && (!capture || report?.state === "READY")) {
        console.log(`[deploy:all] Completed ${script}.`);
        resolve(report);
        return;
      }
      reject(
        new DeploymentScriptError(
          `${script} failed${signal ? ` with signal ${signal}` : ` with exit code ${code ?? "unknown"}`}${capture && !report ? "; no verified Vercel report was returned" : ""}.`,
          report,
        ),
      );
    });
  });
}

function failedReport(
  target: string,
  comment: string,
  message: string,
): VercelDeploymentReport {
  return {
    target,
    project: target === "main" ? "gova" : `asol-${target}`,
    account: "unknown",
    comment,
    state: "ERROR",
    message,
    verifiedAt: new Date().toISOString(),
  };
}

function printFinalSummary(reports: VercelDeploymentReport[]): void {
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

function parseFlags(argv: readonly string[]): DeployFlags {
  const known = new Set([
    "--skip-preflight",
    "--allow-empty",
    "--allow-manifest-downgrade",
    "--allow-scratch-files",
  ]);
  const unknown = argv.filter((arg) => !known.has(arg));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown option(s): ${unknown.join(", ")}. Known: ${[...known].join(", ")}.`,
    );
  }
  return {
    skipPreflight: argv.includes("--skip-preflight"),
    allowEmpty: argv.includes("--allow-empty"),
    allowManifestDowngrade: argv.includes("--allow-manifest-downgrade"),
    allowScratchFiles: argv.includes("--allow-scratch-files"),
  };
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
  "build:static",
  // Added after every one of these passed and all four service accounts still failed
  // their remote build. Each service is uploaded alone and installed against its own
  // `package.json`; nothing above exercises that. This is the only step that builds a
  // service the way Vercel does.
  "services:build",
] as const;

async function preflight(flags: DeployFlags): Promise<void> {
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
      await runNpmScript(step);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Preflight failed at "${step}": ${message}\n` +
          "Nothing has been committed or pushed. Fix the failure and run deploy:all again.",
      );
    }
  }
  console.log("[deploy:all] Preflight passed; proceeding to commit and push.");
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

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  // Everything that can refuse the deployment runs before the first git write.
  // The push is what makes a release public and is the point of no return, so
  // nothing below it may be the first place a problem is discovered.
  assertMainBranch();
  assertDeploymentCredentials();
  await preflight(flags);
  assertNoScratchFiles(flags);
  assertReleaseManifestNotDowngraded(flags);
  assertSomethingToDeploy(flags);

  console.log("[deploy:all] Creating or verifying the encrypted secrets backup...");
  await runNpmScript("secrets:backup");

  clearStaleGitIndexLock();

  const timestamp = new Date().toISOString();
  const mainComment = `deploy(main): ${timestamp}`;
  console.log(`[deploy:all] Creating deployment commit: ${mainComment}`);
  execFileSync("git", ["add", "-A"], { cwd: ROOT, stdio: "inherit" });
  const commitArgs = ["commit", "--allow-empty", "-m", mainComment];
  if (flags.skipPreflight) {
    // Recorded in history so a shortcut taken under pressure stays visible.
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
  execFileSync("git", ["push", "origin", MAIN_BRANCH], {
    cwd: ROOT,
    stdio: "inherit",
  });
  console.log(
    "[deploy:all] GitHub push completed; only the existing GitHub-linked main Vercel project will auto-deploy.",
  );

  const reports: VercelDeploymentReport[] = [];
  const failures: string[] = [];
  for (const deployment of SERVICE_DEPLOYS) {
    const comment = `deploy(${deployment.target}): ${timestamp} @ ${revision.slice(0, 12)}`;
    try {
      const report = await runNpmScript(deployment.script, {
        captureReport: true,
        env: {
          ASOL_DEPLOYMENT_RUN_ID: `${runId}-${deployment.target}`,
          ASOL_DEPLOYMENT_REVISION: revision,
          ASOL_DEPLOYMENT_COMMENT: comment,
        },
      });
      if (!report) throw new Error("The service returned no deployment report.");
      reports.push(report);
    } catch (error) {
      const report = error instanceof DeploymentScriptError ? error.report : undefined;
      const message = error instanceof Error ? error.message : String(error);
      reports.push(report ?? failedReport(deployment.target, comment, message));
      failures.push(`${deployment.script}: ${message}`);
    }
  }

  try {
    const mainReport = await verifyMainDeployment({ revision, comment: mainComment });
    reports.unshift(mainReport);
    if (mainReport.state !== "READY") failures.push(`main: ${mainReport.message}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reports.unshift(failedReport("main", mainComment, message));
    failures.push(`main: ${message}`);
  }

  printFinalSummary(reports);
  reportNativeSurfaceStatus();
  if (failures.length > 0 || reports.some((report) => report.state !== "READY")) {
    printRollbackGuidance(revision);
    throw new Error(`One or more deployments failed verification:\n- ${failures.join("\n- ")}`);
  }
  console.log("\n[deploy:all] GitHub and all five Vercel production targets are verified READY.");
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
  compareVersions,
  SCRATCH_FILE_PATTERNS,
  PREFLIGHT_STEPS,
  RELEASE_MANIFEST,
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
    console.error(
      "\n[deploy:all] Deployment stopped:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}
