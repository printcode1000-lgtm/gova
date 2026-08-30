import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

import { listAgents } from "./local-agent/agent-registry";
import { gitSoft } from "./local-agent/git";
import { listJsonFiles } from "./local-agent/json-store";
import { recoverStaleLocks } from "./local-agent/lock-store";
import { agentsDir, inspectLogsDir, messagesDir, worktreesDir } from "./local-agent/paths";
import { pruneWorktrees } from "./local-agent/worktree";

/**
 * Reclaim what finished jobs left behind.
 *
 * Crashed jobs leak three things: locks nobody will release, worktrees nobody
 * will reuse, and inspection output nobody will read. Cleanup is idempotent and
 * conservative — it only removes records whose owning agent is already stale.
 */

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function argFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

function olderThan(filePath: string, ageMs: number): boolean {
  try {
    return Date.now() - statSync(filePath).mtimeMs > ageMs;
  } catch {
    return false;
  }
}

function pruneFiles(dir: string, ageMs: number, dryRun: boolean): string[] {
  if (!existsSync(dir)) return [];
  const removed: string[] = [];
  for (const filePath of listJsonFiles(dir)) {
    if (!olderThan(filePath, ageMs)) continue;
    if (!dryRun) rmSync(filePath, { force: true });
    removed.push(path.basename(filePath));
  }
  return removed;
}

function pruneInspectLogs(ageMs: number, dryRun: boolean): string[] {
  const dir = inspectLogsDir();
  if (!existsSync(dir)) return [];
  const removed: string[] = [];
  for (const name of readdirSync(dir)) {
    const filePath = path.join(dir, name);
    if (!olderThan(filePath, ageMs)) continue;
    if (!dryRun) rmSync(filePath, { force: true });
    removed.push(name);
  }
  return removed;
}

function pruneStaleAgentWorktrees(dryRun: boolean): string[] {
  const removed: string[] = [];
  const live = new Set(listAgents().filter((agent) => agent.liveness !== "stale").map((agent) => agent.agentId));
  const root = worktreesDir();
  if (!existsSync(root)) return removed;
  for (const name of readdirSync(root)) {
    if (name === "__main" || live.has(name)) continue;
    if (!olderThan(path.join(root, name), RETENTION_MS)) continue;
    if (!dryRun) rmSync(path.join(root, name), { recursive: true, force: true });
    removed.push(name);
  }
  return removed;
}

function main(): void {
  const dryRun = argFlag("dry-run");
  const result = {
    dryRun,
    recoveredLocks: dryRun ? [] : recoverStaleLocks(),
    prunedMessages: pruneFiles(messagesDir(), RETENTION_MS, dryRun),
    prunedAgents: pruneFiles(agentsDir(), RETENTION_MS, dryRun),
    prunedInspectLogs: pruneInspectLogs(RETENTION_MS, dryRun),
    prunedWorktrees: pruneStaleAgentWorktrees(dryRun),
    worktrees: dryRun ? [] : pruneWorktrees(),
    staleGatewayRefs: gitSoft(["for-each-ref", "--format=%(refname)", "refs/gova-gateway"], process.cwd())
      .split("\n")
      .filter(Boolean),
  };
  console.log(JSON.stringify(result, null, 2));
}

main();
