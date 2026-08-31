import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { acquireLock, coordinationDir, declareAgent, ensureDir, git, gitLines, gitSoft, heartbeat, isOpen, jobReserveMb, LockConflictError, messagesDir, normalizeAgentId, OperationLog, patchSecretViolations, prepareWorktree, releaseAgentLocks, removeWorktree, requestsDir, runCapture, waitForAdmission, worktreeSlug } from "@asol/local-agent-core";
import { envWithHostToolShims, wrapLoginShellCommand } from "@asol/local-agent-core/host";
/**
 * Apply one agent mutation on the local machine and push it.
 *
 * A job may carry a patch, a shell command, both, or neither — "neither" is a
 * verification-only run. Whatever it carries, the work happens in an isolated
 * worktree rebased on the freshest `origin/main`, under scope locks that keep
 * concurrent agents off each other's files, and it is refused rather than
 * force-landed if `origin/main` moved while the job was running.
 */

const ALLOWED_VERIFICATION_COMMANDS = new Map<string, string[]>([
  ["none", []],
  ["github-ci-policy", ["npm", "run", "github:ci-policy"]],
  ["runtime-check", ["npm", "run", "runtime:check"]],
  ["docs-ci", ["npm", "run", "docs:ci"]],
  ["architecture-check", ["npm", "run", "architecture:check"]],
  ["typecheck", ["npm", "run", "typecheck"]],
  ["lint", ["npm", "run", "lint"]],
]);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const agentId = normalizeAgentId(process.env.LOCAL_AGENT_ID?.trim() || "agent");
const targetMode = process.env.LOCAL_AGENT_TARGET_MODE?.trim() === "branch" ? "branch" : "main";
const requestId = process.env.LOCAL_AGENT_REQUEST_ID?.trim() || null;
const runId = (process.env.GITHUB_RUN_ID?.trim() || `${Date.now()}`).replace(/[^A-Za-z0-9._-]+/g, "-");
const patchBase64 = process.env.LOCAL_AGENT_PATCH_BASE64?.trim() || "";
const shellCommand = process.env.LOCAL_AGENT_SHELL_COMMAND?.trim() || "";
const commitMessage = process.env.LOCAL_AGENT_COMMIT_MESSAGE?.trim() || "";
const verification = process.env.LOCAL_AGENT_VERIFICATION?.trim() || "github-ci-policy";
const requestedScopes = splitList(process.env.LOCAL_AGENT_SCOPES);
const executionTarget = process.env.LOCAL_AGENT_EXECUTION_TARGET?.trim() === "canonical-host"
  ? "canonical-host" as const
  : "isolated-worktree" as const;
const timeoutMinutesRaw = Number(process.env.LOCAL_AGENT_TIMEOUT_MINUTES || "15");
const timeoutMinutes = Number.isInteger(timeoutMinutesRaw) && timeoutMinutesRaw >= 1 && timeoutMinutesRaw <= 55
  ? timeoutMinutesRaw
  : 15;
const commandTimeoutMs = timeoutMinutes * 60_000;
if (targetMode !== "main" && executionTarget === "canonical-host") {
  fail("canonical-host execution is only valid for local-agent-main.");
}
if (executionTarget === "canonical-host" && patchBase64) {
  fail("canonical-host execution refuses patch_base64; use an isolated worktree for repository edits.");
}

const verificationCommand = ALLOWED_VERIFICATION_COMMANDS.get(verification);
if (!verificationCommand) fail(`Unsupported verification command: ${verification}.`);
if (!commitMessage) fail("LOCAL_AGENT_COMMIT_MESSAGE is required.");

let patchText = "";
if (patchBase64) {
  patchText = Buffer.from(patchBase64, "base64").toString("utf8");
  if (!patchText.includes("diff --git ")) fail("Patch must be a git diff.");
  const violations = patchSecretViolations(patchText);
  if (violations.length > 0) fail(`Secret-bearing files cannot be modified by this workflow: ${violations.join(", ")}`);
}

const targetRef = targetMode === "branch" ? `codex/agent-${agentId}-${requestId ?? runId}` : "main";

for (const directory of [coordinationDir(), messagesDir(), requestsDir()]) ensureDir(directory);

const operation = new OperationLog({
  requestId,
  agentId,
  workflow: targetMode === "branch" ? "local-agent-workspace" : "local-agent-main",
  targetMode,
  targetRef,
  runId,
  verification,
  patchProvided: patchText.length > 0,
  shellCommandProvided: shellCommand.length > 0,
  executionTarget,
});

// Assigned once the worktree is chosen. The exit handler may fire before that —
// a scope conflict aborts before any worktree exists — so it stays nullable.
let worktreeName: string | null = null;

let released = false;
function releaseHeld(): void {
  if (released) return;
  released = true;
  try {
    releaseAgentLocks(agentId);
  } catch {
    // Best effort: stale-lock recovery reclaims anything left behind.
  }
  // A branch worktree belongs to one job. Leaving it behind would grow the disk
  // by a full checkout per run; direct-main's shared worktree is kept because it
  // is reused by the next serialized writer.
  if (targetMode !== "branch" || worktreeName === null) return;
  try {
    removeWorktree(worktreeName);
  } catch {
    // npm run local-agent:cleanup reclaims whatever is left.
  }
}

process.once("exit", (code) => {
  if (isOpen(operation.record.status)) {
    try {
      operation.write(code === 0 ? "success" : "failed", code);
    } catch {
      // The log is advisory; never mask the real exit code.
    }
  }
  releaseHeld();
});

/**
 * Die tidily when something else decides this job is over.
 *
 * Node runs no `exit` handler for a default-handled signal, so a job killed from
 * outside — the machine's out-of-memory killer, a job timeout, a cancelled run —
 * would otherwise leave its locks held, its worktree on disk, and its record
 * claiming to be in flight until the stale timeout expired. Catching the signal
 * turns all three into a clean, correctly labelled failure, and re-raising it
 * keeps the exit status honest: 128 plus the signal number, so `143` still reads
 * as SIGTERM to everything downstream.
 */
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
  process.once(signal, () => {
    operation.record.terminatedBy = signal;
    operation.record.failedCommand = operation.record.failedCommand ?? `terminated-by-${signal}`;
    try {
      operation.write("failed", 128 + (signal === "SIGINT" ? 2 : signal === "SIGHUP" ? 1 : 15));
    } catch {
      // Never let bookkeeping delay the exit.
    }
    releaseHeld();
    process.exit(128 + (signal === "SIGINT" ? 2 : signal === "SIGHUP" ? 1 : 15));
  });
}

function abort(message: string, exitCode = 1): never {
  console.error(message);
  operation.write("failed", exitCode);
  process.exit(exitCode);
}

// --- locks -----------------------------------------------------------------

const lockScopes: Array<{ kind: "path" | "ref"; scope: string }> = [
  { kind: "ref", scope: targetMode === "main" ? "ref:main" : `ref:${targetRef}` },
  ...requestedScopes.map((scope) => ({ kind: "path" as const, scope })),
];

declareAgent({
  agentId,
  origin: process.env.LOCAL_AGENT_ORIGIN?.trim() || "workflow",
  task: commitMessage.slice(0, 200),
  scopes: requestedScopes,
  branch: targetRef,
  status: "mutating",
  runId,
});

const recoveredStaleLockIds: string[] = [];
for (const entry of lockScopes) {
  try {
    const result = acquireLock({ agentId, kind: entry.kind, scope: entry.scope, runId, note: targetRef });
    recoveredStaleLockIds.push(...result.recoveredStaleLockIds);
  } catch (error) {
    if (error instanceof LockConflictError) {
      abort(`Scope conflict: ${error.message}`);
    }
    abort(error instanceof Error ? error.message : String(error));
  }
}
operation.record.lockScopes = lockScopes.map((entry) => entry.scope);
operation.record.recoveredStaleLockIds = recoveredStaleLockIds;
operation.record.staleLockRecovered = recoveredStaleLockIds.length > 0;
operation.write("waiting");

// --- admission --------------------------------------------------------------

const admission = waitForAdmission((reason, waitedMs) => {
  console.log(`waiting for capacity: ${reason} (${Math.round(waitedMs / 1000)}s)`);
});
operation.record.admissionWaitMs = admission.waitedMs;
if (!admission.admitted) {
  abort(
    `Refusing to start: ${admission.reason}. Nothing was touched; re-dispatch when the machine is quieter.`,
  );
}
operation.record.reservedMb = jobReserveMb();
operation.record.admittedAt = new Date().toISOString();
operation.write("running");
if (admission.waitedMs > 0) console.log(`admitted after ${Math.round(admission.waitedMs / 1000)}s`);

// --- worktree ---------------------------------------------------------------

const slug = worktreeSlug(targetMode, agentId, requestId ?? runId);
let worktree: string;
let baseSha: string;
if (executionTarget === "canonical-host") {
  operation.progress("canonical-preflight");
  const canonical = path.resolve(process.env.GOVA_LOCAL_WORKSPACE || "/home/hesham/gova");
  gitSoft(["fetch", "--prune", "origin", "main"], canonical);
  const branch = gitSoft(["branch", "--show-current"], canonical).trim();
  const head = gitSoft(["rev-parse", "HEAD"], canonical).trim();
  const originMain = gitSoft(["rev-parse", "origin/main"], canonical).trim();
  const trackedStatus = gitSoft(["status", "--porcelain", "--untracked-files=no"], canonical)
    .split("\n").filter(Boolean);
  operation.record.preGitState = { head: head || null, originMain: originMain || null, trackedStatus };
  if (branch !== "main" || trackedStatus.length > 0 || !head || head !== originMain) {
    operation.failAs("workspace");
    abort(`canonical-host preflight refused: branch=${branch || "detached"}, trackedChanges=${trackedStatus.length}, head=${head}, originMain=${originMain}`);
  }
  worktree = canonical;
  baseSha = head;
  worktreeName = null;
} else {
  operation.progress("worktree-prepare");
  worktreeName = slug;
  let prepared: { worktree: string; baseSha: string };
  try {
    prepared = prepareWorktree(slug);
  } catch (error) {
    operation.failAs("workspace");
    abort(`Failed to prepare the agent worktree: ${error instanceof Error ? error.message : String(error)}`);
  }
  worktree = prepared.worktree;
  baseSha = prepared.baseSha;
}

operation.record.startingSha = baseSha;
operation.write("running");
console.log(`executionTarget=${executionTarget}`);
console.log(`worktree=${worktree}`);
console.log(`targetRef=${targetRef}`);
console.log(`startingSha=${baseSha}`);
console.log(`commandTimeoutMinutes=${timeoutMinutes}`);

function runIn(
  command: string,
  args: string[],
  extraEnv: Record<string, string> = {},
  stage = command === "/bin/bash" ? "shell" : "command",
): void {
  operation.progress(stage);
  operation.record.mutationStarted = stage === "shell" || operation.record.mutationStarted === true;
  const result = spawnSync(command, args, {
    cwd: worktree,
    env: envWithHostToolShims({ ...process.env, ...extraEnv }),
    stdio: "inherit",
    timeout: commandTimeoutMs,
    killSignal: "SIGTERM",
  });
  if (result.error && (result.error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
    operation.failAs("timeout");
    operation.record.failedCommand = stage;
    abort(`Command timed out after ${timeoutMinutes} minute(s): ${stage}`, 124);
  }
  if (result.status !== 0) {
    operation.record.failedCommand = command === "/bin/bash" ? "shell_command" : `${command} ${args.join(" ")}`;
    abort(`Command failed: ${operation.record.failedCommand}`, result.status ?? 1);
  }
  operation.progress(`${stage}-complete`);
}

// --- patch ------------------------------------------------------------------

if (patchText) {
  const patchDir = path.join(tmpdir(), "gova-local-agent");
  mkdirSync(patchDir, { recursive: true, mode: 0o700 });
  const patchPath = path.join(patchDir, `patch-${process.pid}.diff`);
  writeFileSync(patchPath, patchText, { mode: 0o600 });
  const check = runCapture("git", ["apply", "--check", patchPath], worktree);
  if (check.status !== 0) {
    operation.record.failedCommand = "git apply --check";
    abort(`Patch does not apply to ${baseSha}: ${check.stderr || check.stdout}`);
  }
  runIn("git", ["apply", patchPath]);
}

// --- shell ------------------------------------------------------------------

if (shellCommand) {
  heartbeat(agentId, "shell");
  runIn("/bin/bash", ["-lc", wrapLoginShellCommand(shellCommand)], {
    DOCS_CONTRACT_CHANGE: process.env.DOCS_CONTRACT_CHANGE || "1",
    GOVA_LOCAL_WORKSPACE: worktree,
  }, "shell");
}

const statusArgs = executionTarget === "canonical-host"
  ? ["status", "--porcelain", "--untracked-files=no"]
  : ["status", "--porcelain"];
const changedFiles = gitLines(statusArgs, worktree).map((line) => line.slice(3));
operation.record.changedFiles = changedFiles;
operation.write("running");
if (executionTarget === "canonical-host" && changedFiles.length > 0) {
  operation.failAs("workspace");
  abort(`canonical-host command left tracked changes; refusing implicit cleanup or commit: ${changedFiles.join(", ")}`);
}

// --- verification -----------------------------------------------------------

if (verificationCommand.length > 0) {
  heartbeat(agentId, "verifying");
  const [command, ...args] = verificationCommand;
  runIn(command!, args, { DOCS_CONTRACT_CHANGE: process.env.DOCS_CONTRACT_CHANGE || "1" }, "verification");
}

// --- commit and push --------------------------------------------------------

if (executionTarget === "canonical-host") {
  operation.progress("canonical-postflight");
  gitSoft(["fetch", "--prune", "origin", "main"], worktree);
  const head = gitSoft(["rev-parse", "HEAD"], worktree).trim();
  const originMain = gitSoft(["rev-parse", "origin/main"], worktree).trim();
  const trackedStatus = gitSoft(["status", "--porcelain", "--untracked-files=no"], worktree)
    .split("\n").filter(Boolean);
  operation.record.postGitState = { head: head || null, originMain: originMain || null, trackedStatus };
  if (trackedStatus.length > 0 || !head || head !== originMain) {
    operation.failAs("workspace");
    abort(`canonical-host postflight refused: trackedChanges=${trackedStatus.length}, head=${head}, originMain=${originMain}`);
  }
  operation.record.resultingSha = head;
  operation.progress("complete");
  operation.write("success", 0);
  releaseHeld();
  process.exit(0);
}

if (changedFiles.length === 0) {
  console.log("No changes to commit; verification-only run completed.");
  operation.record.resultingSha = baseSha;
  operation.progress("complete");
  operation.write("success", 0);
  releaseHeld();
  process.exit(0);
}

git(["config", "user.name", "gova-local-agent"], worktree);
git(["config", "user.email", "gova-local-agent@users.noreply.github.com"], worktree);
runIn("git", ["add", "-A"]);
runIn("git", ["commit", "-m", commitMessage], {}, "commit");
const resultingSha = git(["rev-parse", "HEAD"], worktree);
operation.record.resultingSha = resultingSha;
operation.write("running");

// Refuse to land work that was built on a `main` which has since moved.
gitSoft(["fetch", "--prune", "origin", "main"], worktree);
const currentOriginMain = gitSoft(["rev-parse", "origin/main"], worktree);
if (currentOriginMain && currentOriginMain !== baseSha) {
  operation.record.failedCommand = "stale-base-check";
  abort(
    `origin/main moved from ${baseSha} to ${currentOriginMain} while this job ran. ` +
      "Re-dispatch so the patch applies to current main.",
  );
}

heartbeat(agentId, "pushing");
// Fully qualified: the worktree is on a detached HEAD, so git cannot infer the
// namespace of an unqualified destination and refuses to guess.
runIn("git", ["push", "origin", `HEAD:refs/heads/${targetRef}`], {}, "push");

operation.write("success", 0);
console.log(`resultingSha=${resultingSha}`);
console.log(`changedFiles=${changedFiles.length}`);
declareAgent({ agentId, status: "idle", branch: targetRef, runId });
releaseHeld();
