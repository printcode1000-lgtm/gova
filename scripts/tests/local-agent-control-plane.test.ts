import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

import { declareAgent, listAgents, livenessOf, DEFAULT_HEARTBEAT_TTL_MS } from "../local-agent/agent-registry";
import {
  acquireLock,
  releaseLock,
  releaseAgentLocks,
  listLocks,
  recoverStaleLocks,
  scopesConflict,
  LockConflictError,
} from "../local-agent/lock-store";
import { postMessage, listMessages } from "../local-agent/message-store";
import { validateDispatchRequest, DISPATCHABLE_WORKFLOWS, MAX_REQUEST_AGE_MS } from "../local-agent/request-contract";
import { isSecretPath, patchSecretViolations, looksLikeSecretValue } from "../local-agent/secret-paths";
import { buildCoordinationSnapshot } from "../local-agent/coordination-snapshot";
import { MAIN_WORKTREE_SLUG, worktreeSlug } from "../local-agent/worktree";
import { recordRequest, knownRequestIds } from "../local-agent/request-store";
import {
  ALLOWED_WORKFLOW_FILES,
  DEPLOY_CONTROL_PLANE_IGNORES,
  deploymentWorkflowViolations,
  localAgentGatewayWorkflowViolations,
  localAgentCoordinationWorkflowViolations,
  localAgentWorkflowViolations,
} from "../github-ci-policy";

const repoRoot = process.cwd();
const workflow = (name: string): string => readFileSync(path.join(repoRoot, ".github", "workflows", name), "utf8");

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

// --- workflow policy ------------------------------------------------------------

assert.deepEqual(
  [...ALLOWED_WORKFLOW_FILES],
  [
    "deploy-main.yml",
    "docs.yml",
    "local-agent-coordination.yml",
    "local-agent-gateway.yml",
    "local-agent-inspect.yml",
    "local-agent-main.yml",
    "local-agent-status.yml",
    "local-agent-workspace.yml",
  ],
  "only permanent workflows are allowed; temporary probes cannot survive",
);

assert.deepEqual(deploymentWorkflowViolations(workflow("deploy-main.yml")), []);
assert.deepEqual(localAgentGatewayWorkflowViolations(workflow("local-agent-gateway.yml")), []);
assert.deepEqual(localAgentCoordinationWorkflowViolations(workflow("local-agent-coordination.yml")), []);
assert.deepEqual(localAgentWorkflowViolations(workflow("local-agent-main.yml")), []);
assert.deepEqual(localAgentWorkflowViolations(workflow("local-agent-workspace.yml")), []);

// A control-plane commit must not be able to deploy production.
const deployBody = workflow("deploy-main.yml");
for (const ignored of DEPLOY_CONTROL_PLANE_IGNORES) {
  assert.equal(deployBody.includes(`- "${ignored}"`), true, `deploy-main must ignore ${ignored}`);
}
assert.match(
  deploymentWorkflowViolations(deployBody.replace('      - ".agent-control/**"\n', "")).join(" "),
  /control-plane changes/,
  "dropping a control-plane path filter fails the policy",
);

// Local jobs must not re-materialise a workspace they already have.
assert.match(
  localAgentWorkflowViolations(
    workflow("local-agent-main.yml").replace(
      "    steps:\n",
      "    steps:\n      - uses: actions/checkout@v4\n",
    ),
  ).join(" "),
  /must not check out the repository/,
  "a reintroduced checkout fails the policy",
);

// The gateway is the only local workflow allowed to react to a push, and never on main.
assert.match(
  localAgentGatewayWorkflowViolations(workflow("local-agent-gateway.yml").replace('- "agent-request/**"', "- main")).join(" "),
  /agent-request/,
  "the gateway cannot be repointed at main",
);

assert.equal(Object.keys(DISPATCHABLE_WORKFLOWS).length, 5);
for (const contract of Object.values(DISPATCHABLE_WORKFLOWS)) {
  assert.equal(
    (ALLOWED_WORKFLOW_FILES as readonly string[]).includes(contract.file),
    true,
    `${contract.file} must be a permanent workflow`,
  );
}

// --- cleanup ------------------------------------------------------------------

writeFileSync(path.join(sandbox, "probe.txt"), "ok", { mode: 0o600 });
rmSync(sandbox, { recursive: true, force: true });

console.log("local agent control plane: all checks passed.");
