import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { hostname, tmpdir } from "node:os";
import path from "node:path";

/**
 * Adversarial coverage for the local agent control plane.
 *
 * The control plane's job is to say no: to a replayed request, to a second
 * agent reaching into a locked scope, to a patch that touches `.env`, to a
 * coordination commit that would deploy production. Each case below is one of
 * those refusals, plus the positive paths that must keep working alongside them.
 */

const sandbox = mkdtempSync(path.join(tmpdir(), "gova-control-plane-test-"));
process.env.GOVA_AGENT_COORDINATION_DIR = sandbox;
process.env.GOVA_AGENT_STALE_LOCK_MS = String(60 * 60 * 1000);
import { acquireLock, assessSwap, prepareWorktree, removeWorktree, RESCUE_REF_NAMESPACE, worktreePath, buildCoordinationSnapshot, declareAgent, DEFAULT_HEARTBEAT_TTL_MS, DISPATCHABLE_WORKFLOWS, isOpen, isSecretPath, knownRequestIds, listAgents, listLocks, listMessages, listOperations, livenessOf, LockConflictError, lockId, looksLikeSecretValue, MAIN_WORKTREE_SLUG, MAX_REQUEST_AGE_MS, maxConcurrentMutations, memoryFloorFor, memoryFloorMb, ownerIsAlive, patchSecretViolations, pendingReservationMb, postMessage, readMemory, reconcileOrphanedOperations, recordRequest, recoverStaleLocks, releaseAgentLocks, releaseLock, scopesConflict, FLUSH_SAFETY_MARGIN_MB, SWAP_FLUSH_COMMAND, swapIsHealthy, validateDispatchRequest, waitForAdmission, worktreeSlug } from "@asol/local-agent-core";
import { envWithHostToolShims, hostToolAllowed, setHostToolAllowed, wrapLoginShellCommand } from "@asol/local-agent-core/host";
import { buildWatchModel, EMPTY_GITHUB_SAMPLE, humanDuration, renderFrame, sshAliases, visibleLength } from "@asol/local-agent-core/monitor";


function validRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 1,
    requestId: "req-00000001",
    agentId: "cloud-alpha",
    workflow: "local-agent-inspect",
    mode: "inspect",
    ref: "main",
    inputs: { agent_id: "cloud-alpha", mode: "git" },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// --- dispatch request validation --------------------------------------------

assert.equal(validateDispatchRequest(validRequest()).valid, true, "a well-formed request validates");

assert.match(
  validateDispatchRequest(validRequest({ workflow: "deploy-main" })).errors.join(" "),
  /workflow must be one of/,
  "the workflow allowlist is closed",
);

assert.match(
  validateDispatchRequest(validRequest({ requestId: "short" })).errors.join(" "),
  /requestId must be/,
  "request ids are constrained",
);

assert.match(
  validateDispatchRequest(validRequest(), { knownRequestIds: new Set(["req-00000001"]) }).errors.join(" "),
  /duplicate execution refused/,
  "a request id is single-use",
);

assert.match(
  validateDispatchRequest(
    validRequest({ createdAt: new Date(Date.now() - MAX_REQUEST_AGE_MS - 1000).toISOString() }),
  ).errors.join(" "),
  /stale request refused/,
  "a stale request cannot be replayed",
);

assert.match(
  validateDispatchRequest(validRequest({ createdAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() })).errors.join(" "),
  /future/,
  "a future-dated request is refused",
);

assert.match(
  validateDispatchRequest(validRequest({ ref: "some-other-branch" })).errors.join(" "),
  /ref must be one of/,
  "dispatch refs are constrained to main",
);

assert.match(
  validateDispatchRequest(validRequest({ inputs: { agent_id: "a1", unexpected_input: "x" } })).errors.join(" "),
  /not accepted by/,
  "unknown inputs are refused",
);

assert.match(
  validateDispatchRequest(
    validRequest({
      workflow: "local-agent-coordination",
      mode: "coordination",
      inputs: { agent_id: "a1", action: "message", message_body: "token: hunter2supersecret" },
    }),
  ).errors.join(" "),
  /looks like it carries a secret/,
  "secret-looking inputs are refused",
);

// A shell-only mutation is a first-class job: no fake patch required.
assert.equal(
  validateDispatchRequest(
    validRequest({
      workflow: "local-agent-workspace",
      mode: "workspace",
      inputs: { agent_id: "a1", commit_message: "chore: regenerate", shell_command: "npm run docs:generate" },
    }),
  ).valid,
  true,
  "shell-only workspace jobs validate",
);

const patchOnly = Buffer.from(
  "diff --git a/docs/README.md b/docs/README.md\n--- a/docs/README.md\n+++ b/docs/README.md\n",
).toString("base64");
assert.equal(
  validateDispatchRequest(
    validRequest({
      workflow: "local-agent-main",
      mode: "main",
      inputs: { agent_id: "a1", commit_message: "docs: touch", patch_base64: patchOnly },
    }),
  ).valid,
  true,
  "patch-only main jobs validate",
);
assert.equal(
  validateDispatchRequest(
    validRequest({
      workflow: "local-agent-main",
      mode: "main",
      inputs: { agent_id: "a1", commit_message: "docs: touch", patch_base64: patchOnly, shell_command: "npm run lint" },
    }),
  ).valid,
  true,
  "patch plus shell jobs validate",
);
// Verification-only is a real shape: no patch, no shell, but something to check.
// It has to validate through the gateway exactly as it does through a direct
// dispatch, and it has to hold when `verification` is omitted and the workflow's
// own default applies.
assert.equal(
  validateDispatchRequest(
    validRequest({
      workflow: "local-agent-workspace",
      mode: "workspace",
      inputs: { agent_id: "a1", commit_message: "chore: verify only", verification: "typecheck" },
    }),
  ).valid,
  true,
  "verification-only workspace jobs validate",
);
assert.equal(
  validateDispatchRequest(
    validRequest({
      workflow: "local-agent-main",
      mode: "main",
      inputs: { agent_id: "a1", commit_message: "chore: verify only", verification: "github-ci-policy" },
    }),
  ).valid,
  true,
  "verification-only main jobs validate",
);
assert.equal(
  validateDispatchRequest(
    validRequest({
      workflow: "local-agent-main",
      mode: "main",
      inputs: { agent_id: "a1", commit_message: "chore: verify only" },
    }),
  ).valid,
  true,
  "an omitted verification falls back to the workflow default, not to nothing",
);
assert.match(
  validateDispatchRequest(
    validRequest({
      workflow: "local-agent-main",
      mode: "main",
      inputs: { agent_id: "a1", commit_message: "empty", verification: "none" },
    }),
  ).errors.join(" "),
  /would do nothing/,
  "only the genuinely empty job is refused",
);
assert.match(
  validateDispatchRequest(
    validRequest({
      workflow: "local-agent-main",
      mode: "main",
      inputs: { agent_id: "a1", commit_message: "x", verification: "npm run rm-rf" },
    }),
  ).errors.join(" "),
  /verification must be one of/,
  "the verification allowlist is closed",
);

const secretPatch = Buffer.from("diff --git a/.env.local b/.env.local\n+TOKEN=1\n").toString("base64");
assert.match(
  validateDispatchRequest(
    validRequest({
      workflow: "local-agent-main",
      mode: "main",
      inputs: { agent_id: "a1", commit_message: "leak", patch_base64: secretPatch },
    }),
  ).errors.join(" "),
  /secret-bearing path/,
  "a patch touching .env is refused at the gateway",
);

// --- secret handling ---------------------------------------------------------

assert.equal(isSecretPath(".env"), true);
assert.equal(isSecretPath(".env.local"), true);
assert.equal(isSecretPath(".secret-archive/private-key.pem"), true);
assert.equal(isSecretPath("assets/google-play/k.jks"), true);
assert.equal(isSecretPath("src/app/page.tsx"), false);
assert.deepEqual(patchSecretViolations("diff --git a/src/app/page.tsx b/src/app/page.tsx\n"), []);
assert.equal(looksLikeSecretValue("ghp_abcdefghijklmnopqrstuvwxyz0123456789"), true);
assert.equal(looksLikeSecretValue("please review src/app/page.tsx"), false);

// --- locks -------------------------------------------------------------------

assert.equal(scopesConflict({ kind: "path", scope: "src/app" } as never, { kind: "path", scope: "src/app/page.tsx" }), true);
assert.equal(scopesConflict({ kind: "path", scope: "src/app" } as never, { kind: "path", scope: "src/appearance" }), false);
assert.equal(scopesConflict({ kind: "module", scope: "ota" } as never, { kind: "path", scope: "ota" }), false);

acquireLock({ agentId: "agent-one", kind: "path", scope: "src/app" });
assert.throws(
  () => acquireLock({ agentId: "agent-two", kind: "path", scope: "src/app/page.tsx" }),
  LockConflictError,
  "a second agent cannot reach into a locked subtree",
);
assert.equal(
  acquireLock({ agentId: "agent-one", kind: "path", scope: "src/app" }).reentrant,
  true,
  "an owner re-acquiring its own scope refreshes it",
);
assert.throws(
  () => releaseLock("agent-two", "path", "src/app"),
  /cannot be released by/,
  "only the owner may release a live lock",
);
assert.equal(releaseLock("agent-one", "path", "src/app"), true);
assert.equal(listLocks().length, 0);

// A crashed agent's lock is reclaimed once its TTL passes.
acquireLock({ agentId: "agent-dead", kind: "path", scope: "packages/data-core", ttlMs: 1 });
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
assert.equal(recoverStaleLocks().length, 1, "stale locks are recovered automatically");
assert.equal(listLocks().length, 0);

acquireLock({ agentId: "agent-three", kind: "ref", scope: "ref:main" });
assert.throws(
  () => acquireLock({ agentId: "agent-four", kind: "ref", scope: "ref:main" }),
  LockConflictError,
  "direct-main work serializes on a single ref lock",
);
assert.equal(releaseAgentLocks("agent-three").length, 1);

// Branch-mode agents do not contend: their refs differ.
acquireLock({ agentId: "agent-five", kind: "ref", scope: "ref:codex/agent-five-1" });
acquireLock({ agentId: "agent-six", kind: "ref", scope: "ref:codex/agent-six-2" });
assert.equal(listLocks().length, 2, "parallel branch agents hold independent ref locks");
releaseAgentLocks("agent-five");
releaseAgentLocks("agent-six");

// --- worktree isolation ---------------------------------------------------------

// Two jobs from one agent must not share a mutable directory: the agent id is
// stable across a task, so a retry or a second request would otherwise reset and
// clean a run that is still in flight.
assert.notEqual(
  worktreeSlug("branch", "same-agent", "req-1"),
  worktreeSlug("branch", "same-agent", "req-2"),
  "same agent, different requests get different worktrees",
);
assert.notEqual(
  worktreeSlug("branch", "agent-x", "req-1"),
  worktreeSlug("branch", "agent-y", "req-1"),
  "different agents get different worktrees",
);
assert.equal(
  worktreeSlug("main", "any-agent", "req-1"),
  MAIN_WORKTREE_SLUG,
  "direct-main keeps one shared worktree; it is serialized",
);
assert.equal(
  worktreeSlug("main", "other-agent", "req-2"),
  worktreeSlug("main", "any-agent", "req-1"),
  "every direct-main job reuses that same worktree",
);

// --- agents and heartbeats ---------------------------------------------------

const now = Date.now();
declareAgent({ agentId: "cloud-alpha", origin: "cloud", task: "refactor", scopes: ["src/app"] }, now);
assert.equal(listAgents(now).some((agent) => agent.agentId === "cloud-alpha"), true);
assert.equal(livenessOf({ heartbeatAt: new Date(now).toISOString(), heartbeatTtlMs: DEFAULT_HEARTBEAT_TTL_MS } as never, now), "active");
assert.equal(
  livenessOf(
    { heartbeatAt: new Date(now - 10 * 60 * 1000).toISOString(), heartbeatTtlMs: DEFAULT_HEARTBEAT_TTL_MS } as never,
    now,
  ),
  "idle",
);
assert.equal(
  livenessOf(
    { heartbeatAt: new Date(now - 60 * 60 * 1000).toISOString(), heartbeatTtlMs: DEFAULT_HEARTBEAT_TTL_MS } as never,
    now,
  ),
  "stale",
  "an expired heartbeat marks the agent dead",
);

// --- messaging ----------------------------------------------------------------

postMessage({ from: "cloud-alpha", to: "local-beta", kind: "do-not-modify", body: "holding src/app", scope: "src/app" });
assert.equal(listMessages({ to: "local-beta" }).length, 1, "a cloud agent and a local agent share one channel");
assert.throws(() => postMessage({ from: "a", kind: "shout", body: "hi" }), /Unsupported message kind/);
assert.throws(
  () => postMessage({ from: "a", kind: "note", body: "ghp_abcdefghijklmnopqrstuvwxyz0123456789" }),
  /carries a secret/,
  "secrets cannot enter the coordination channel",
);

// --- request ledger and snapshot ----------------------------------------------

recordRequest({
  requestId: "req-00000002",
  agentId: "cloud-alpha",
  workflow: "local-agent-main",
  mode: "main",
  ref: "main",
  inputKeys: ["patch_base64", "commit_message"],
  createdAt: new Date().toISOString(),
  outcome: "dispatched",
});
assert.equal(knownRequestIds().has("req-00000002"), true);
const snapshot = buildCoordinationSnapshot();
const snapshotText = JSON.stringify(snapshot);
assert.equal(snapshot.requests.length, 1);
assert.equal(snapshotText.includes("patch_base64"), false, "input values and keys stay out of the published snapshot");
assert.equal(snapshotText.includes(sandbox), false, "local filesystem paths stay out of the published snapshot");

// --- termination recovery -----------------------------------------------------

// The pool's worst failure is not a crash but an out-of-memory kill: SIGTERM
// arrives, the job dies without an epilogue, and its lock and its record outlive
// it. A lock whose owning process is gone must be reclaimable immediately rather
// than after the full stale timeout.
const deadPid = 2_147_483_600; // Above /proc/sys/kernel/pid_max; cannot be live.
acquireLock({ agentId: "killed-agent", kind: "path", scope: "src/killed" });
const killedLockPath = path.join(sandbox, "locks", `${lockId("path", "src/killed")}.json`);
const killedLock = JSON.parse(readFileSync(killedLockPath, "utf8")) as Record<string, unknown>;
writeFileSync(killedLockPath, JSON.stringify({ ...killedLock, pid: deadPid, host: hostname() }));

assert.equal(ownerIsAlive({ ...killedLock, pid: deadPid, host: hostname() } as never), false, "a dead pid reads as dead");
assert.equal(
  ownerIsAlive({ ...killedLock, pid: deadPid, host: "some-other-machine" } as never),
  null,
  "a pid from another host tells us nothing",
);
assert.equal(
  listLocks().some((lock) => lock.scope === "src/killed" && lock.stale),
  true,
  "a lock whose owner is gone is stale at once, without waiting out the TTL",
);
assert.equal(recoverStaleLocks().length >= 1, true, "and it is reclaimed");
assert.equal(listLocks().some((lock) => lock.scope === "src/killed"), false);

// A record left "running" by a killed job must not keep claiming to be in flight.
const orphanPath = path.join(sandbox, "logs", "operations", "orphan-run.json");
mkdirSync(path.dirname(orphanPath), { recursive: true });
writeFileSync(
  orphanPath,
  JSON.stringify({
    requestId: null,
    agentId: "killed-agent",
    workflow: "local-agent-workspace",
    targetMode: "branch",
    targetRef: "codex/agent-killed-agent-1",
    runId: "run",
    runnerName: null,
    host: hostname(),
    pid: deadPid,
    startingSha: null,
    resultingSha: null,
    changedFiles: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationMs: 0,
    verification: "none",
    patchProvided: false,
    shellCommandProvided: true,
    lockScopes: [],
    staleLockRecovered: false,
    recoveredStaleLockIds: [],
    retryCount: 0,
    status: "running",
    exitCode: null,
    failedCommand: null,
    terminatedBy: null,
  }),
);
const reconciled = reconcileOrphanedOperations();
assert.equal(reconciled.length, 1, "the abandoned record is closed out");
assert.equal(reconciled[0]!.status, "failed");
assert.equal(reconciled[0]!.abandoned, true);
assert.equal(
  listOperations(50).some((operation) => operation.status === "running"),
  false,
  "nothing still claims to be in flight",
);

const waitingOrphanPath = path.join(sandbox, "logs", "operations", "waiting-orphan.json");
writeFileSync(
  waitingOrphanPath,
  JSON.stringify({
    requestId: null,
    agentId: "waiting-agent",
    workflow: "local-agent-workspace",
    targetMode: "branch",
    targetRef: "codex/agent-waiting-agent-1",
    runId: "run",
    runnerName: null,
    host: hostname(),
    pid: deadPid,
    startingSha: null,
    resultingSha: null,
    changedFiles: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationMs: 0,
    verification: "none",
    patchProvided: false,
    shellCommandProvided: true,
    lockScopes: [],
    staleLockRecovered: false,
    recoveredStaleLockIds: [],
    retryCount: 0,
    status: "waiting",
    exitCode: null,
    failedCommand: null,
    terminatedBy: null,
  }),
);
assert.equal(reconcileOrphanedOperations().some((operation) => operation.agentId === "waiting-agent"), true);
assert.equal(isOpen("waiting"), true);
assert.equal(isOpen("running"), true);
assert.equal(isOpen("success"), false);

// --- admission control ----------------------------------------------------------

// Six runners can each start a job that pulls in a heavy toolchain. Waiting for
// capacity is the whole point: the alternative is the machine choosing which
// jobs to kill.
assert.equal(readMemory() !== null, true, "memory is readable on this platform");
const reading = readMemory()!;
assert.equal(reading.totalMb > 0, true);
assert.equal(reading.availableMb >= 0, true);
assert.equal(maxConcurrentMutations() >= 1, true, "the budget is at least one, or nothing could ever run");

process.env.GOVA_AGENT_MAX_CONCURRENT_MUTATIONS = "4";
assert.equal(maxConcurrentMutations(), 4, "the budget is configurable");
process.env.GOVA_AGENT_MEMORY_FLOOR_MB = "1";
assert.equal(memoryFloorMb(), 1);
delete process.env.GOVA_AGENT_MEMORY_FLOOR_MB;
assert.equal(swapIsHealthy({ availableMb: 4096, totalMb: 15_702, swapFreeMb: 0, swapTotalMb: 4096 }), false);
assert.equal(
  memoryFloorFor({ availableMb: 4096, totalMb: 15_702, swapFreeMb: 0, swapTotalMb: 4096 }),
  3_106,
  "exhausted swap raises the floor to earlyoom memory line plus one job reserve",
);
process.env.GOVA_AGENT_MEMORY_FLOOR_MB = "1";
process.env.GOVA_AGENT_ADMISSION_TIMEOUT_MS = "0";
assert.equal(waitForAdmission().admitted, true, "a quiet machine admits immediately");

// With the floor above total memory the decision must be a clean refusal, not a
// hang: a refused job has touched nothing and leaves nothing to clean up.
process.env.GOVA_AGENT_MEMORY_FLOOR_MB = String(reading.totalMb * 10);
const refused = waitForAdmission();
assert.equal(refused.admitted, false, "an impossible floor refuses instead of hanging");
assert.match(refused.reason ?? "", /available/);
delete process.env.GOVA_AGENT_MEMORY_FLOOR_MB;
delete process.env.GOVA_AGENT_MAX_CONCURRENT_MUTATIONS;
delete process.env.GOVA_AGENT_ADMISSION_TIMEOUT_MS;

const reservedPath = path.join(sandbox, "logs", "operations", "reserved-run.json");
writeFileSync(
  reservedPath,
  JSON.stringify({
    requestId: null,
    agentId: "reserved-agent",
    workflow: "local-agent-workspace",
    targetMode: "branch",
    targetRef: "codex/agent-reserved-agent-1",
    runId: "run",
    runnerName: null,
    host: hostname(),
    pid: process.pid,
    startingSha: null,
    resultingSha: null,
    changedFiles: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationMs: 0,
    verification: "none",
    patchProvided: false,
    shellCommandProvided: true,
    lockScopes: [],
    staleLockRecovered: false,
    recoveredStaleLockIds: [],
    retryCount: 0,
    status: "running",
    exitCode: null,
    failedCommand: null,
    terminatedBy: null,
    reservedMb: 1536,
    admittedAt: new Date().toISOString(),
  }),
);
assert.equal(pendingReservationMb(Date.now(), -1), 1536, "fresh admitted jobs reserve memory for the next decision");

// --- host profiles and tools ----------------------------------------------------

const sshConfig = path.join(sandbox, "ssh-config");
writeFileSync(sshConfig, "Host laptop *.wild ignored?\n  HostName 192.0.2.1\nHost desktop\n  HostName 127.0.0.1\n");
assert.deepEqual(sshAliases(sshConfig), ["desktop", "laptop"], "ssh host aliases skip wildcard patterns");

const previousWorkspaceEnv = process.env.GOVA_LOCAL_WORKSPACE;
process.env.GOVA_LOCAL_WORKSPACE = sandbox;
setHostToolAllowed(false);
assert.equal(hostToolAllowed(), false, "missing or false policy excludes Antigravity");
for (const command of ["antigravity", "agy"]) {
  assert.equal(
    spawnSync(command, ["--version"], { env: envWithHostToolShims(), encoding: "utf8" }).status,
    127,
    `${command} is refused by the shim`,
  );
}
assert.equal(spawnSync("node", ["--version"], { env: envWithHostToolShims(), encoding: "utf8" }).status, 0);
assert.equal(spawnSync("git", ["--version"], { env: envWithHostToolShims(), encoding: "utf8" }).status, 0);
assert.match(wrapLoginShellCommand("printf ok"), /^PATH='/, "login shell commands reassert shims first");
if (previousWorkspaceEnv === undefined) delete process.env.GOVA_LOCAL_WORKSPACE;
else process.env.GOVA_LOCAL_WORKSPACE = previousWorkspaceEnv;

// --- monitor ---------------------------------------------------------------------

// The monitor must be a reader. If rendering a frame could ever write, it would
// show up in the state it reports and compete with the agents it watches.
declareAgent({ agentId: "watched-agent", origin: "cloud", task: "being watched", scopes: ["src/app"] });
acquireLock({ agentId: "watched-agent", kind: "path", scope: "src/app" });

function coordinationFingerprint(): string {
  const walk = (dir: string): string[] => {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return [];
    }
    return entries.flatMap((entry) => {
      const full = path.join(dir, entry);
      const stats = statSync(full);
      return stats.isDirectory() ? walk(full) : [`${full}:${stats.size}:${stats.mtimeMs}`];
    });
  };
  return walk(sandbox).sort().join("|");
}

const beforeFrames = coordinationFingerprint();
const model = buildWatchModel(EMPTY_GITHUB_SAMPLE);
const frame = renderFrame(model, { width: 120, height: 60, color: false, paused: false, focus: null });
assert.equal(coordinationFingerprint(), beforeFrames, "rendering the monitor must not touch the coordination channel");

assert.match(frame, /watched-agent/, "the frame reports the declared agent");
assert.match(frame, /path:src\/app/, "the frame reports the held lock");
assert.match(frame, /runners \(6\)/, "the frame lists the whole pool");
assert.match(frame, /host tools/, "the frame reports host tool policy");
assert.match(frame, /remote hosts/, "the frame reports remote host cache");

// A focused frame shows one panel; an unfocused one shows them all.
const focused = renderFrame(model, { width: 120, height: 60, color: false, paused: false, focus: "locks" });
assert.equal(focused.includes("path:src/app"), true);
assert.equal(/^ agents /m.test(focused), false, "a focused frame drops the other panels");
assert.equal(/^ agents /m.test(frame), true, "an unfocused frame keeps them");

// Colour must not change the layout the width calculations depend on.
assert.equal(
  visibleLength(renderFrame(model, { width: 120, height: 60, color: true, paused: false, focus: "locks" }).split("\n")[0]!),
  visibleLength(focused.split("\n")[0]!),
  "colour is invisible to width",
);

assert.equal(humanDuration(45_000), "45s");
assert.equal(humanDuration(90_000), "1m30s");
assert.equal(humanDuration(3_600_000), "1h00m");
assert.equal(humanDuration(-1), "\u2014");
releaseAgentLocks("watched-agent");



// --- worktree rescue -------------------------------------------------------------

// Cleanup removes a dead job's worktree with --force, and the jobs whose
// worktrees get reclaimed are largely jobs that were killed. Killing one
// mid-edit is exactly when its changes are worth keeping, so removal must not be
// the same thing as destruction.
{
  const slug = "rescue-contract-probe";
  prepareWorktree(slug);
  const dir = worktreePath(slug);
  writeFileSync(path.join(dir, "RESCUED.txt"), "must survive\n");
  execFileSync("git", ["-C", dir, "add", "RESCUED.txt"]);

  const outcome = removeWorktree(slug);
  assert.equal(outcome.removed, true, "the worktree is still removed");
  assert.equal(outcome.rescuedRef, `${RESCUE_REF_NAMESPACE}/${slug}`, "and the work is parked under a ref");
  assert.equal(existsSync(dir), false, "the directory is gone");

  const recovered = execFileSync("git", ["show", `${outcome.rescuedRef}:RESCUED.txt`], { encoding: "utf8" });
  assert.equal(recovered.trim(), "must survive", "the content is readable after the directory is destroyed");
  execFileSync("git", ["update-ref", "-d", outcome.rescuedRef!]);
}

// A clean worktree has nothing to rescue, and must not leave a ref behind.
{
  const slug = "rescue-clean-probe";
  prepareWorktree(slug);
  const outcome = removeWorktree(slug);
  assert.equal(outcome.removed, true);
  assert.equal(outcome.rescuedRef, null, "a clean worktree produces no rescue ref");
}

// Removing something that is not there is not an error, and rescues nothing.
assert.deepEqual(removeWorktree("worktree-that-never-existed"), { removed: false, rescuedRef: null });

// --- swap hygiene ---------------------------------------------------------------

// A full swap does not drain on its own, and the flush that empties it pulls
// every swapped page back into RAM. Recommending one that cannot fit would trade
// a slow machine for a killed one, so the safety check is the point of this.
assert.equal(assessSwap({ availableMb: 8_000, totalMb: 16_000, swapFreeMb: 4_000, swapTotalMb: 4_096 }).verdict, "healthy");
assert.equal(assessSwap({ availableMb: 8_000, totalMb: 16_000, swapFreeMb: 0, swapTotalMb: 0 }).verdict, "no-swap");

const recommended = assessSwap({ availableMb: 6_000, totalMb: 16_000, swapFreeMb: 2, swapTotalMb: 4_096 });
assert.equal(recommended.verdict, "flush-recommended", "a full swap with room in RAM should be flushed");
assert.equal(recommended.command, SWAP_FLUSH_COMMAND);
assert.equal(recommended.usedMb, 4_094);

// 4094MB swapped needs 4094 + 1024 available; 4500 is not enough.
const unsafe = assessSwap({ availableMb: 4_500, totalMb: 16_000, swapFreeMb: 2, swapTotalMb: 4_096 });
assert.equal(unsafe.verdict, "flush-unsafe", "a flush that cannot fit in RAM must not be recommended");
assert.equal(unsafe.command, null, "an unsafe verdict offers no command to run");
assert.match(unsafe.reason, /Wait for jobs to finish/);

// The boundary itself: exactly the margin is enough, one megabyte less is not.
assert.equal(
  assessSwap({ availableMb: 4_094 + FLUSH_SAFETY_MARGIN_MB, totalMb: 16_000, swapFreeMb: 2, swapTotalMb: 4_096 }).verdict,
  "flush-recommended",
);
assert.equal(
  assessSwap({ availableMb: 4_094 + FLUSH_SAFETY_MARGIN_MB - 1, totalMb: 16_000, swapFreeMb: 2, swapTotalMb: 4_096 }).verdict,
  "flush-unsafe",
);

assert.equal(assessSwap(null).verdict, "no-swap", "an unreadable /proc/meminfo recommends nothing");

// --- cleanup ------------------------------------------------------------------

writeFileSync(path.join(sandbox, "probe.txt"), "ok", { mode: 0o600 });
rmSync(sandbox, { recursive: true, force: true });

console.log("@asol/local-agent-core: all checks passed.");
