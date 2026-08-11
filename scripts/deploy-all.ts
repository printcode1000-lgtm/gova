import { execFileSync, spawn, type ChildProcess } from "node:child_process";

const ROOT = process.cwd();
const MAIN_BRANCH = "main";
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

  const results = await Promise.allSettled(
    SERVICE_DEPLOYS.map((script) => runNpmScript(script)),
  );
  const failures = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [`${SERVICE_DEPLOYS[index]}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
      : [],
  );

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
