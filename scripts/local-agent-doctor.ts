import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { agentsDir, coordinationDir, DISPATCHABLE_WORKFLOWS, gitSoft, hasGithubToken, hostProfile, hostProfileName, isOpen, listAgents, listLocks, listOperations, listRequests, listRunners, locksDir, logsDir, maxConcurrentMutations, memoryFloorMb, memoryFloorReason, messagesDir, operationLogsDir, pendingReservationMb, readMemory, requestsDir, RUNNER_DIRECTORY_NAMES, RUNNER_GITHUB_NAMES, RUNNER_SERVICE_NAMES, runnerPoolDir, workflowExists, workspaceDir, worktreesDir } from "@asol/local-agent-core";
import { companionRepositoryStates, hostToolState } from "@asol/local-agent-core/host";
import { probeRemoteHosts, readRemoteHostsCache } from "@asol/local-agent-core/monitor";
/**
 * Health check for the whole local agent control plane.
 *
 * Answers one question per line — is this piece healthy — so a failing pool can
 * be diagnosed without reading six services' journals. It reports paths and
 * counts, never credentials: the GitHub token is reported as present or absent
 * and never as a value.
 */

const LEGACY_RUNNER_ROOT = "/home/hesham/github-runners";

type Level = "PASS" | "WARN" | "FAIL";

interface Check {
  name: string;
  level: Level;
  detail: string;
}

const checks: Check[] = [];

function record(name: string, level: Level, detail: string): void {
  checks.push({ name, level, detail });
}

function assert(name: string, ok: boolean, okDetail: string, failDetail: string, failLevel: Level = "FAIL"): void {
  record(name, ok ? "PASS" : failLevel, ok ? okDetail : failDetail);
}

function systemctl(args: string[]): string {
  try {
    return execFileSync("systemctl", ["--user", ...args], { encoding: "utf8" }).trim();
  } catch (error) {
    const failure = error as { stdout?: string };
    return (failure.stdout || "").trim();
  }
}

function checkWorkspace(): void {
  const workspace = workspaceDir();
  assert("workspace", existsSync(path.join(workspace, ".git")), `${workspace} is a git repository.`, `${workspace} is not a git repository.`);
  assert(
    "workspace.node_modules",
    existsSync(path.join(workspace, "node_modules")),
    "Dependencies are installed locally, so verification runs need no npm ci.",
    "node_modules is missing; local verification will fail.",
  );
  assert(
    "workspace.gitignore",
    execIgnored(workspace),
    ".local/ is ignored by git.",
    ".local/ is NOT ignored; runner runtime could be committed.",
  );
}

function execIgnored(workspace: string): boolean {
  try {
    execFileSync("git", ["check-ignore", "-q", ".local"], { cwd: workspace, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function checkPool(): void {
  const pool = runnerPoolDir();
  record("host.profile", "PASS", `${hostProfileName()} profile, ${hostProfile().size} runner(s).`);
  assert("runner-pool.root", existsSync(pool), `Runner pool root: ${pool}`, `Missing runner pool root: ${pool}`);
  for (const name of RUNNER_DIRECTORY_NAMES) {
    const dir = path.join(pool, name);
    assert(
      `runner-pool.${name}`,
      existsSync(path.join(dir, "run.sh")) && existsSync(path.join(dir, ".runner")),
      `${name} is installed and registered.`,
      `${name} is missing run.sh or .runner at ${dir}.`,
    );
  }
  assert(
    "runner-pool.legacy-root",
    !existsSync(LEGACY_RUNNER_ROOT),
    `Legacy root ${LEGACY_RUNNER_ROOT} is gone; there is one runner source.`,
    `Legacy root ${LEGACY_RUNNER_ROOT} still exists; two runner sources can race.`,
  );
}

function checkCoordination(): void {
  const directories: Array<[string, string]> = [
    ["coordination", coordinationDir()],
    ["coordination.agents", agentsDir()],
    ["coordination.locks", locksDir()],
    ["coordination.messages", messagesDir()],
    ["coordination.requests", requestsDir()],
    ["coordination.logs", logsDir()],
    ["coordination.operations", operationLogsDir()],
  ];
  for (const [name, dir] of directories) {
    if (!existsSync(dir)) {
      record(name, "WARN", `${dir} does not exist yet; it is created on first use.`);
      continue;
    }
    const mode = statSync(dir).mode & 0o777;
    assert(name, mode === 0o700, `${dir} is owner-only (0700).`, `${dir} has mode ${mode.toString(8)}; expected 0700.`, "WARN");
  }
}

function checkServices(): void {
  const slice = systemctl(["is-active", hostProfile().sliceName]);
  assert(`service.${hostProfile().sliceName}.active`, slice === "active", "active/running", `not active (${slice || "unknown"})`, "WARN");
  for (const service of RUNNER_SERVICE_NAMES) {
    const active = systemctl(["is-active", service]) === "active";
    const workingDirectory = systemctl(["show", service, "-p", "WorkingDirectory", "--value"]);
    assert(`service.${service}.active`, active, "active/running", `not active (${systemctl(["is-active", service]) || "unknown"})`);
    assert(
      `service.${service}.path`,
      workingDirectory.startsWith(runnerPoolDir()),
      `WorkingDirectory is inside the pool root.`,
      `WorkingDirectory is "${workingDirectory}", outside ${runnerPoolDir()}.`,
    );
    const assignedSlice = systemctl(["show", service, "-p", "Slice", "--value"]);
    assert(
      `service.${service}.slice`,
      assignedSlice === hostProfile().sliceName,
      `Slice=${assignedSlice}`,
      `Slice=${assignedSlice || "(unset)"}; expected ${hostProfile().sliceName}.`,
      "WARN",
    );
  }
}

function checkGitState(): void {
  const workspace = workspaceDir();
  const branch = gitSoft(["branch", "--show-current"], workspace);
  const head = gitSoft(["rev-parse", "--short", "HEAD"], workspace);
  const dirty = gitSoft(["status", "--porcelain"], workspace).split("\n").filter(Boolean).length;
  record("git.branch", branch === "main" ? "PASS" : "WARN", `branch=${branch || "detached"} head=${head}`);
  record("git.worktree", dirty === 0 ? "PASS" : "WARN", `${dirty} uncommitted change(s).`);
  const worktrees = gitSoft(["worktree", "list"], workspace).split("\n").filter(Boolean);
  record("git.agent-worktrees", "PASS", `${Math.max(0, worktrees.length - 1)} agent worktree(s) under ${worktreesDir()}.`);
}

function checkCoordinationState(): void {
  const agents = listAgents();
  const stale = agents.filter((agent) => agent.liveness === "stale");
  record("agents", stale.length === 0 ? "PASS" : "WARN", `${agents.length} registered, ${stale.length} stale.`);
  const locks = listLocks();
  const staleLocks = locks.filter((lock) => lock.stale);
  record("locks", staleLocks.length === 0 ? "PASS" : "WARN", `${locks.length} held, ${staleLocks.length} stale.`);
  const requests = listRequests(200);
  const failed = requests.filter((request) => request.outcome === "failed" || request.outcome === "rejected");
  record("requests", "PASS", `${requests.length} recorded, ${failed.length} rejected or failed.`);
}

/**
 * Memory headroom.
 *
 * The pool's worst failure mode is not a crash but an out-of-memory kill: the
 * machine resolves pressure by sending SIGTERM across the session, several jobs
 * die at once, and their locks and worktrees outlive them. Reporting the headroom
 * makes that visible before it happens rather than after.
 */
function checkMemory(): void {
  const memory = readMemory();
  if (!memory) {
    record("memory", "WARN", "/proc/meminfo is unreadable; admission control cannot see memory pressure.");
    return;
  }
  const floor = memoryFloorMb();
  const reason = memoryFloorReason(memory);
  const reserved = pendingReservationMb();
  assert(
    "memory.available",
    memory.availableMb >= floor,
    `${memory.availableMb}MB available of ${memory.totalMb}MB (floor ${floor}MB${reason ? ` ${reason}` : ""}, reserved ${reserved}MB).`,
    `only ${memory.availableMb}MB available of ${memory.totalMb}MB; mutations wait below ${floor}MB.`,
    "WARN",
  );
  if (memory.swapTotalMb > 0) {
    const swapFreeRatio = memory.swapFreeMb / memory.swapTotalMb;
    assert(
      "memory.swap",
      swapFreeRatio > 0.1,
      `${memory.swapFreeMb}MB of ${memory.swapTotalMb}MB swap free.`,
      `swap is ${Math.round((1 - swapFreeRatio) * 100)}% used (${memory.swapFreeMb}MB free of ${memory.swapTotalMb}MB); the machine is close to an out-of-memory kill.`,
      "WARN",
    );
  }
  record("memory.budget", "PASS", `at most ${maxConcurrentMutations()} concurrent mutation(s).`);
}

function checkAbandonedOperations(): void {
  const abandoned = listOperations(200).filter((operation) => operation.abandoned === true);
  const open = listOperations(200).filter((operation) => isOpen(operation.status));
  record(
    "operations.in-flight",
    "PASS",
    `${open.length} open, ${abandoned.length} previously abandoned and reconciled.`,
  );
}

function checkHostTools(): void {
  const state = hostToolState();
  record(
    "host-tools.antigravity",
    state.allowed ? "WARN" : "PASS",
    state.allowed
      ? `${state.tool} allowed by ${state.policyPath}.`
      : `${state.tool} excluded by default; policy=${state.policyPath}, shims=${state.shimDir}.`,
  );
}

function checkCompanionRepositories(): void {
  for (const repo of companionRepositoryStates()) {
    assert(
      `companion.${repo.name}`,
      repo.exists && repo.originMatches && repo.entryPointExists,
      `${repo.path} at ${repo.head ?? "unknown"}; entry ${repo.entryPoint}.`,
      !repo.exists
        ? `${repo.path} is missing; restore will clone ${repo.origin}.`
        : `origin/entry mismatch: origin=${repo.currentOrigin ?? "(none)"}, entry=${repo.entryPointExists}.`,
      "WARN",
    );
  }
}

async function checkRemoteHosts(): Promise<void> {
  let remotes = readRemoteHostsCache();
  try {
    remotes = await probeRemoteHosts();
  } catch {
    // Keep the previous cache when probing itself cannot complete.
  }
  record(
    "remote-hosts.cache",
    "PASS",
    remotes.length === 0
      ? "No cached remote host probes yet."
      : remotes.map((host) => `${host.alias}:${host.ok ? `${host.registeredRunners} runner(s)` : "unreachable"}`).join(", "),
  );
}

function checkToolchain(): void {
  const node = process.version;
  const major = Number(node.replace("v", "").split(".")[0]);
  assert("toolchain.node", major >= 20, `Node ${node}`, `Node ${node} is older than the supported 20+.`);
  let npm = "";
  try {
    npm = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
  } catch {
    npm = "";
  }
  assert("toolchain.npm", npm.length > 0, `npm ${npm}`, "npm is not on PATH for the runner user.");
}

async function checkGithub(): Promise<void> {
  assert("github.token", hasGithubToken(), "A local GitHub token is available for dispatch and status reads.", "No local GitHub token; the gateway cannot dispatch.");
  const { runners, error } = await listRunners();
  if (error) {
    record("github.runners", "FAIL", `Runner query failed: ${error}`);
  } else {
    const online = runners.filter((runner) => runner.status === "online");
    const expected = RUNNER_GITHUB_NAMES.filter((name) => online.some((runner) => runner.name === name));
    assert(
      "github.runners",
      expected.length === RUNNER_GITHUB_NAMES.length,
      `All ${RUNNER_GITHUB_NAMES.length} pool runners are online.`,
      `Only ${expected.length}/${RUNNER_GITHUB_NAMES.length} pool runners are online: ${expected.join(", ") || "(none)"}.`,
    );
  }
  for (const [name, contract] of Object.entries(DISPATCHABLE_WORKFLOWS)) {
    const exists = await workflowExists(contract.file);
    assert(`github.workflow.${name}`, exists, `${contract.file} is registered.`, `${contract.file} is not registered on GitHub.`);
  }
}

async function main(): Promise<void> {
  checkWorkspace();
  checkPool();
  checkCoordination();
  checkServices();
  checkGitState();
  checkCoordinationState();
  checkToolchain();
  checkMemory();
  checkAbandonedOperations();
  checkHostTools();
  checkCompanionRepositories();
  await checkRemoteHosts();
  await checkGithub();

  const width = Math.max(...checks.map((check) => check.name.length));
  for (const check of checks) console.log(`${check.level.padEnd(4)} ${check.name.padEnd(width)}  ${check.detail}`);

  const failures = checks.filter((check) => check.level === "FAIL");
  const warnings = checks.filter((check) => check.level === "WARN");
  console.log("");
  console.log(`${checks.length} checks: ${checks.length - failures.length - warnings.length} pass, ${warnings.length} warn, ${failures.length} fail.`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
