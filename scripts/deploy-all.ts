import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MAIN_BRANCH = "main";
const GIT_INDEX_LOCK = path.join(ROOT, ".git", "index.lock");
const STALE_GIT_LOCK_AGE_MS = 2 * 60 * 1000;
const SERVICE_DEPLOYS = [
  "notifications:deploy",
  "products:deploy",
  "orders:deploy",
  "profiles:deploy",
] as const;

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

function runNpmScript(script: string): Promise<void> {
  const npmCli = process.env.npm_execpath;
  const command = npmCli
    ? process.execPath
    : process.platform === "win32"
      ? "npm.cmd"
      : "npm";
  const args = npmCli ? [npmCli, "run", script] : ["run", script];
  return new Promise((resolve, reject) => {
    console.log(`\n[deploy:all] Starting ${script}...`);
    const child: ChildProcess = spawn(command, args, {
      cwd: ROOT,
      env: process.env,
      stdio: "inherit",
      shell: !npmCli && process.platform === "win32",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        console.log(`[deploy:all] Completed ${script}.`);
        resolve();
        return;
      }
      reject(
        new Error(
          `${script} failed${signal ? ` with signal ${signal}` : ` with exit code ${code ?? "unknown"}`}.`,
        ),
      );
    });
  });
}

async function main(): Promise<void> {
  console.log("[deploy:all] Creating or verifying the encrypted secrets backup...");
  await runNpmScript("secrets:backup");

  assertMainBranch();
  clearStaleGitIndexLock();

  const commitMessage = `deploy: ${new Date().toISOString()}`;
  console.log(`[deploy:all] Creating deployment commit: ${commitMessage}`);
  execFileSync("git", ["add", "-A"], { cwd: ROOT, stdio: "inherit" });
  execFileSync("git", ["commit", "--allow-empty", "-m", commitMessage], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (git(["status", "--porcelain"])) {
    throw new Error(
      "The working tree changed while creating the deployment commit; refusing to push inconsistent source.",
    );
  }

  console.log("[deploy:all] Pushing main to GitHub...");
  execFileSync("git", ["push", "origin", MAIN_BRANCH], {
    cwd: ROOT,
    stdio: "inherit",
  });
  console.log(
    "[deploy:all] GitHub push completed; the existing Vercel integration will update gova.",
  );

  const failures: string[] = [];
  for (const script of SERVICE_DEPLOYS) {
    try {
      await runNpmScript(script);
    } catch (error) {
      failures.push(
        `${script}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(`One or more deployments failed:\n- ${failures.join("\n- ")}`);
  }

  console.log("\n[deploy:all] All Vercel service accounts deployed successfully.");
}

main().catch((error) => {
  console.error(
    "\n[deploy:all] Deployment stopped:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
