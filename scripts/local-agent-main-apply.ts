import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
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
const shellCommand = process.env.LOCAL_AGENT_SHELL_COMMAND?.trim() || "";
const targetMode = process.env.LOCAL_AGENT_TARGET_MODE?.trim() || "main";
const agentId = (process.env.LOCAL_AGENT_ID?.trim() || "agent").replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 48);
const runId = (process.env.GITHUB_RUN_ID?.trim() || `${Date.now()}`).replace(/[^A-Za-z0-9._-]+/g, "-");
const verificationCommand = allowedVerificationCommands.get(verification);
const startedAtMs = Date.now();

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
const locksDir = path.join(coordinationDir, "locks");
const logsDir = path.join(coordinationDir, "logs");
const operationLogsDir = path.join(logsDir, "operations");
mkdirSync(path.join(coordinationDir, "inbox"), { recursive: true });
mkdirSync(locksDir, { recursive: true });
mkdirSync(logsDir, { recursive: true });
mkdirSync(operationLogsDir, { recursive: true });

const targetRef = targetMode === "branch" ? `codex/agent-${agentId}-${runId}` : "main";
const lockPath = path.join(locksDir, `${targetMode === "branch" ? targetRef.replaceAll("/", "-") : "main"}.lock`);
const operationLogPath = path.join(operationLogsDir, `${targetRef.replaceAll("/", "-")}-${runId}.json`);
const staleLockMs = Number(process.env.GOVA_AGENT_STALE_LOCK_MS || 90 * 60 * 1000);

const operationLog: Record<string, unknown> = {
  agentId,
  targetMode,
  targetRef,
  runId,
  runnerName: process.env.RUNNER_NAME || null,
  host: hostname(),
  pid: process.pid,
  startedAt: new Date(startedAtMs).toISOString(),
  startingSha: null,
  resultingSha: null,
  changedFiles: [],
  verification,
  shellCommandProvided: shellCommand.length > 0,
  staleLockRecovered: false,
  status: "running",
};

function writeOperationLog(status: "running" | "success" | "failed", exitCode?: number): void {
  const completedAtMs = Date.now();
  operationLog.status = status;
  operationLog.completedAt = status === "running" ? null : new Date(completedAtMs).toISOString();
  operationLog.durationMs = completedAtMs - startedAtMs;
  if (typeof exitCode === "number") operationLog.exitCode = exitCode;
  writeFileSync(operationLogPath, JSON.stringify(operationLog, null, 2), { mode: 0o600 });
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env): void {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    operationLog.failedCommand = command;
    writeOperationLog("failed", result.status ?? 1);
    process.exit(result.status ?? 1);
  }
}

function capture(command: string, args: string[]): string {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}

function lockStartedAtMs(): number {
  try {
    const parsed = JSON.parse(readFileSync(lockPath, "utf8")) as { startedAt?: string };
    const parsedMs = parsed.startedAt ? Date.parse(parsed.startedAt) : Number.NaN;
    if (Number.isFinite(parsedMs)) return parsedMs;
  } catch {}
  try {
    return statSync(lockPath).mtimeMs;
  } catch {
    return Date.now();
  }
}

function recoverStaleLock(): boolean {
  if (!existsSync(lockPath)) return false;
  const ageMs = Date.now() - lockStartedAtMs();
  if (ageMs < staleLockMs) return false;
  try {
    unlinkSync(lockPath);
    operationLog.staleLockRecovered = true;
    operationLog.staleLockAgeMs = ageMs;
    console.warn(`Recovered stale ${targetRef} lock after ${Math.round(ageMs / 1000)} seconds.`);
    return true;
  } catch {
    return false;
  }
}

function acquireLock(): number {
  const create = (): number => {
    const fd = openSync(lockPath, "wx", 0o600);
    writeFileSync(
      fd,
      JSON.stringify({
        agentId,
        targetMode,
        targetRef,
        runId,
        pid: process.pid,
        host: hostname(),
        startedAt: new Date(startedAtMs).toISOString(),
      }),
    );
    return fd;
  };

  try {
    return create();
  } catch {
    if (recoverStaleLock()) {
      try {
        return create();
      } catch {}
    }
    console.error(`Another local agent job already holds the ${targetRef} lock.`);
    writeOperationLog("failed", 1);
    process.exit(1);
  }
}

let lockFd: number | null = acquireLock();
let lockActive = true;
writeOperationLog("running");

process.once("exit", (code) => {
  if ((operationLog.status as string) === "running") {
    try {
      writeOperationLog(code === 0 ? "success" : "failed", code);
    } catch {}
  }
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
operationLog.startingSha = capture("git", ["rev-parse", "HEAD"]) || null;
if (targetMode === "branch") run("git", ["checkout", "-B", targetRef]);
run("git", ["apply", "--check", patchPath]);
run("git", ["apply", patchPath]);
operationLog.changedFiles = capture("git", ["diff", "--name-only"]).split("\n").filter(Boolean);

if (shellCommand) {
  run("/bin/bash", ["-lc", shellCommand], {
    ...process.env,
    DOCS_CONTRACT_CHANGE: process.env.DOCS_CONTRACT_CHANGE || "1",
  });
  operationLog.changedFiles = capture("git", ["status", "--short"]).split("\n").filter(Boolean);
}

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
operationLog.resultingSha = capture("git", ["rev-parse", "HEAD"]) || null;
run("git", ["push", "origin", `HEAD:${targetRef}`]);
writeOperationLog("success", 0);

if (lockFd !== null) closeSync(lockFd);
unlinkSync(lockPath);
lockActive = false;
