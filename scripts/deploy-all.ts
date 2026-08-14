import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

import {
  type VercelDeploymentReport,
  waitForVercelProductionDeployment,
} from "./lib/vercel-deployment-monitor";

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
  console.log("[deploy:all] Creating or verifying the encrypted secrets backup...");
  await runNpmScript("secrets:backup");

  assertMainBranch();
  clearStaleGitIndexLock();

  const timestamp = new Date().toISOString();
  const mainComment = `deploy(main): ${timestamp}`;
  console.log(`[deploy:all] Creating deployment commit: ${mainComment}`);
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
  if (failures.length > 0 || reports.some((report) => report.state !== "READY")) {
    throw new Error(`One or more deployments failed verification:\n- ${failures.join("\n- ")}`);
  }
  console.log("\n[deploy:all] GitHub and all five Vercel production targets are verified READY.");
}

main().catch((error) => {
  console.error(
    "\n[deploy:all] Deployment stopped:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
