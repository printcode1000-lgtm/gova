import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type DeployPushTarget,
  resolveServiceDeployTargets,
} from "./deploy-push-target-choice";
import {
  DeploymentNpmScriptError,
  runDeploymentNpmScript,
} from "@asol/release-core";
import { pushMainBranch } from "@asol/release-core";
import {
  type VercelDeploymentReport,
  waitForVercelProductionDeployment,
} from "@asol/vercel-deploy-core";
import { loadReleaseEnvironment } from "./load-release-env";

loadReleaseEnvironment();

const ROOT = process.cwd();
const MAIN_BRANCH = "main";
const GIT_INDEX_LOCK = path.join(ROOT, ".git", "index.lock");
const ROOT_VERCEL_LINK = path.join(ROOT, ".vercel", "project.json");
const STALE_GIT_LOCK_AGE_MS = 2 * 60 * 1000;
const FAIL_PREFIX = "[deploy:push] FAILED —";

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

function verifyGitHubPush(revision: string): void {
  console.log("[deploy:push] Verifying origin/main matches the pushed commit...");
  execFileSync("git", ["fetch", "origin", MAIN_BRANCH], {
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

async function main(): Promise<void> {
  const isolatedTargets = await resolveServiceDeployTargets(process.argv.slice(2));

  assertMainBranch();
  assertMainDeploymentCredentials();

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
    execFileSync("git", ["commit", "--allow-empty", "-m", mainComment], {
      cwd: ROOT,
      stdio: "inherit",
    });
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

  const reports: VercelDeploymentReport[] = [];

  for (const isolatedTarget of isolatedTargets) {
    const deployment = ISOLATED_DEPLOYS[isolatedTarget];
    const comment = `deploy(${deployment.target}): ${timestamp} @ ${revision.slice(0, 12)}`;
    try {
      const report = await runDeploymentNpmScript(deployment.script, {
        logPrefix: "deploy:push",
        captureReport: true,
        env: {
          ASOL_DEPLOYMENT_RUN_ID: `${runId}-${deployment.target}`,
          ASOL_DEPLOYMENT_REVISION: revision,
          ASOL_DEPLOYMENT_COMMENT: comment,
        },
      });
      if (!report) {
        fail(`${deployment.script} returned no deployment report.`, revision);
        return;
      }
      reports.push(report);
    } catch (error) {
      const report = error instanceof DeploymentNpmScriptError ? error.report : undefined;
      const message = error instanceof Error ? error.message : String(error);
      if (report) reports.push(report);
      if (reports.length > 0) printFinalSummary(reports);
      fail(`${deployment.script}: ${message}`, revision);
      return;
    }
  }

  let mainReport: VercelDeploymentReport;
  try {
    mainReport = await verifyMainDeployment({ revision, comment: mainComment });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (reports.length > 0) printFinalSummary(reports);
    fail(`main Vercel verification failed: ${message}`, revision);
    return;
  }

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
