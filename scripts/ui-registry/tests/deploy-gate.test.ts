import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { isUiRegistryPendingOpen, type UiRegistryPendingRequest } from "@asol/ui-registry-core";
import {
  DEPLOY_ALL_PREFLIGHT_SECTIONS,
  DEPLOY_ALL_RUNBOOK,
} from "@asol/release-core/console";

const ROOT = process.cwd();

function pendingRequest(
  overrides: Partial<UiRegistryPendingRequest> = {},
): UiRegistryPendingRequest {
  return {
    id: "request-1",
    uid: "pending.home.button-a8K3xP",
    descriptor: { uid: "pending.home.button-a8K3xP", id: "pending.home.button" },
    locator: { component: "button", route: "/home", anchor: "home-thing-button" },
    status: "pending",
    reason: null,
    createdAt: "2026-08-26T00:00:00.000Z",
    createdBy: "super-admin-uid",
    resolvedAt: null,
    ...overrides,
  };
}

// ── The gate is registered on every deploy:all path ────────────────────────
const preflightCommands = DEPLOY_ALL_PREFLIGHT_SECTIONS.flatMap((section) =>
  section.branches.map((branch) => branch.command),
);
assert.ok(
  preflightCommands.includes("ui-registry:pending:check"),
  "deploy:all preflight must refuse pending UiRegistry requests.",
);

// `deploy:all` reads the canonical sections, so every phase that runs preflight
// inherits the gate rather than each path re-listing it.
const preflightPhases = DEPLOY_ALL_RUNBOOK.filter((phase) =>
  phase.sections.some((section) =>
    section.branches.some((branch) => branch.command === "ui-registry:pending:check"),
  ),
);
assert.ok(preflightPhases.length > 0, "the gate must live inside a runbook phase");
assert.equal(
  readFileSync(join(ROOT, "scripts/deploy-all.ts"), "utf8").includes(
    "DEPLOY_ALL_PREFLIGHT_SECTIONS.flatMap",
  ),
  true,
  "deploy:all must derive its preflight steps from the canonical sections.",
);

// The command exists as a real npm script; a runbook entry naming a missing
// script is exactly the defect this whole task started from.
const scripts = (
  JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  }
).scripts;
for (const command of ["ui-registry:pending:check", "ui-registry:apply-pending"]) {
  assert.ok(scripts[command], `npm script ${command} must exist`);
}
assert.match(scripts["ui-registry:apply-pending"]!, /scripts\/ui-registry\/apply-pending\.ts/);
assert.match(
  scripts["ui-registry:apply-pending"]!,
  /NODE_ENV=development/,
  "apply-pending must default to local SQLite; unset NODE_ENV is treated as production Turso",
);
assert.match(scripts["ui-registry:pending:check"]!, /scripts\/ui-registry\/check-pending\.ts/);

// Apply-pending is a Terminal Task, not a Run and Debug launch.
const launch = readFileSync(join(ROOT, ".vscode/launch.json"), "utf8");
assert.equal(
  launch.includes("ui-registry:apply-pending"),
  false,
  "ui-registry:apply-pending must not appear in launch.json",
);
for (const match of launch.matchAll(/"runtimeArgs":\s*\["run",\s*"([^"]+)"\]/g)) {
  assert.ok(scripts[match[1]!], `launch.json references missing npm script ${match[1]}`);
}
const tasks = JSON.parse(readFileSync(join(ROOT, ".vscode/tasks.json"), "utf8")) as {
  tasks: Array<{ script?: string; type?: string; label?: string; detail?: string }>;
};
const applyPendingTask = tasks.tasks.find((task) => task.script === "ui-registry:apply-pending");
assert.ok(applyPendingTask, "tasks.json must run ui-registry:apply-pending");
assert.equal(applyPendingTask.type, "npm");
assert.match(applyPendingTask.label ?? "", /apply pending/i);
assert.match(applyPendingTask.detail ?? "", /queued UiRegistry/i);

// ── What the gate refuses ──────────────────────────────────────────────────
// Blocked and pending are both open: an unresolved request is unresolved
// however it failed.
assert.equal(isUiRegistryPendingOpen(pendingRequest()), true);
assert.equal(
  isUiRegistryPendingOpen(pendingRequest({ status: "blocked", reason: "ambiguous source" })),
  true,
);
assert.equal(isUiRegistryPendingOpen(pendingRequest({ status: "resolved" })), false);

const gate = readFileSync(join(ROOT, "scripts/ui-registry/check-pending.ts"), "utf8");
// Refuses when the queue has work.
assert.match(gate, /open\.length === 0/);
assert.match(gate, /process\.exitCode = 1/);
// Refuses when it cannot read the queue at all: no answer is not "no work".
assert.match(gate, /catch \(error\)/);
assert.match(gate, /could not be read, so the deploy cannot proceed/);
assert.match(gate, /listOpen\(\)/);

console.log("UiRegistry deploy-gate tests passed.");
