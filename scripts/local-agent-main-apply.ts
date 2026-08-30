import { spawnSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const allowedVerificationCommands = new Map<string, string[]>([
  ["none", []],
  ["github-ci-policy", ["npm", "run", "github:ci-policy"]],
  ["runtime-check", ["npm", "run", "runtime:check"]],
  ["docs-ci", ["npm", "run", "docs:ci"]],
  ["architecture-check", ["npm", "run", "architecture:check"]],
  ["typecheck", ["npm", "run", "typecheck"]],
  ["lint", ["npm", "run", "lint"]],
]);

function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env): void {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`${name} is required.`);
    process.exit(1);
  }
  return value;
}

const patchBase64 = requireEnv("LOCAL_AGENT_PATCH_BASE64");
const commitMessage = requireEnv("LOCAL_AGENT_COMMIT_MESSAGE");
const verification = process.env.LOCAL_AGENT_VERIFICATION?.trim() || "github-ci-policy";
const targetMode = process.env.LOCAL_AGENT_TARGET_MODE?.trim() || "main";
const agentId = (process.env.LOCAL_AGENT_ID?.trim() || "agent").replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 48);
const runId = (process.env.GITHUB_RUN_ID?.trim() || `${Date.now()}`).replace(/[^A-Za-z0-9._-]+/g, "-");
const verificationCommand = allowedVerificationCommands.get(verification);

if (!verificationCommand) {
  console.error(`Unsupported verification command: ${verification}.`);
  process.exit(1);
}

const patchText = Buffer.from(patchBase64, "base64").toString("utf8");
if (!patchText.includes("\ndiff --git ") && !patchText.startsWith("diff --git ")) {
  console.error("Patch must be a git diff.");
  process.exit(1);
}
if (/^diff --git a\/(?:\.env|\.secret-archive|\.ota\/private-key|config\/secret-archive)/m.test(patchText)) {
  console.error("Secret-bearing files cannot be modified by this workflow.");
  process.exit(1);
}

const patchDir = path.join(tmpdir(), "gova-local-agent");
mkdirSync(patchDir, { recursive: true });
const patchPath = path.join(patchDir, `patch-${process.pid}.diff`);
writeFileSync(patchPath, patchText, { mode: 0o600 });

const coordinationDir = process.env.GOVA_AGENT_COORDINATION_DIR || "/home/hesham/github-runners/gova-coordination";
mkdirSync(path.join(coordinationDir, "inbox"), { recursive: true });
mkdirSync(path.join(coordinationDir, "locks"), { recursive: true });
mkdirSync(path.join(coordinationDir, "logs"), { recursive: true });
const targetRef = targetMode === "branch" ? `codex/agent-${agentId}-${runId}` : "main";
const lockPath = path.join(coordinationDir, "locks", `${targetMode === "branch" ? targetRef.replaceAll("/", "-") : "main"}.lock`);
let lockFd: number | null = null;
let lockActive = false;
try {
  lockFd = openSync(lockPath, "wx", 0o600);
  writeFileSync(lockFd, JSON.stringify({ agentId, targetMode, targetRef, runId, startedAt: new Date().toISOString() }));
  lockActive = true;
} catch {
  console.error(`Another local agent job already holds the ${targetRef} lock.`);
  process.exit(1);
}
process.once("exit", () => {
  if (!lockActive) return;
  try {
    if (lockFd !== null) closeSync(lockFd);
  } catch {}
  try {
    unlinkSync(lockPath);
  } catch {}
});

run("git", ["fetch", "--prune", "origin", "main"]);
run("git", ["checkout", "main"]);
run("git", ["reset", "--hard", "origin/main"]);
if (targetMode === "branch") run("git", ["checkout", "-B", targetRef]);
run("git", ["apply", "--check", patchPath]);
run("git", ["apply", patchPath]);

if (verificationCommand.length > 0) {
  const [command, ...args] = verificationCommand;
  run(command!, args, {
    ...process.env,
    DOCS_CONTRACT_CHANGE: process.env.DOCS_CONTRACT_CHANGE || "1",
  });
}

run("git", ["status", "--short"]);
run("git", ["config", "user.name", "gova-local-agent"]);
run("git", ["config", "user.email", "gova-local-agent@users.noreply.github.com"]);
run("git", ["add", "-A"]);
run("git", ["commit", "-m", commitMessage]);
run("git", ["push", "origin", `HEAD:${targetRef}`]);
writeFileSync(
  path.join(coordinationDir, "logs", `${targetRef.replaceAll("/", "-")}.json`),
  JSON.stringify({ agentId, targetMode, targetRef, runId, completedAt: new Date().toISOString() }, null, 2),
);
if (lockFd !== null) closeSync(lockFd);
unlinkSync(lockPath);
lockActive = false;
