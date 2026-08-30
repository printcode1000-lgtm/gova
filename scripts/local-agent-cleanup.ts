import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { assessSwap, agentsDir, gitSoft, inspectLogsDir, isOpen, listAgents, listJsonFiles, listOperations, MAIN_WORKTREE_SLUG, messagesDir, pruneWorktrees, reconcileOrphanedOperations, recoverStaleLocks, removeWorktree, worktreesDir, worktreeSlug } from "@asol/local-agent-core";
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
  // A worktree whose job is provably over can go immediately, whatever its age.
  // Waiting out the retention window would keep a full checkout per killed job on
  // disk, which is exactly the pressure that killed them.
  const runningPids = new Set(
    listOperations(200).filter((operation) => isOpen(operation.status)).map((operation) => operation.pid),
  );
  const root = worktreesDir();
  if (!existsSync(root)) return removed;
  for (const name of readdirSync(root)) {
    // Branch worktrees are named <agent_id>-<job_id>, so a live agent is
    // recognised by prefix. The shared direct-main worktree is never pruned:
    // it is reused by the next serialized writer.
    if (name === MAIN_WORKTREE_SLUG) continue;
    // Ask the same function the job used, so a name the slug truncated still
    // matches the operation that created it.
    const owningOperation = listOperations(200).find(
      (operation) =>
        operation.targetMode === "branch" &&
        worktreeSlug("branch", operation.agentId, operation.requestId ?? operation.runId) === name,
    );
    const finished = owningOperation !== undefined && !isOpen(owningOperation.status);
    if (!finished) {
      if ([...live].some((agentId) => name === agentId || name.startsWith(`${agentId}-`))) continue;
      if (!olderThan(path.join(root, name), RETENTION_MS)) continue;
    }
    if (owningOperation && runningPids.has(owningOperation.pid) && !finished) continue;
    if (dryRun) {
      removed.push(name);
      continue;
    }
    const outcome = removeWorktree(name);
    // Say when work was saved. A rescued ref nobody is told about is the same as
    // a lost one.
    removed.push(outcome.rescuedRef ? `${name} (rescued to ${outcome.rescuedRef})` : name);
  }
  return removed;
}

function main(): void {
  const dryRun = argFlag("dry-run");
  const result = {
    dryRun,
    // Reconcile first: a record left "running" by a killed job is what makes the
    // monitor report work that is not happening, and its lock is reclaimed in the
    // same pass because the owning process is provably gone.
    abandonedOperations: dryRun
      ? []
      : reconcileOrphanedOperations().map((operation) => `${operation.agentId}:${operation.targetRef}`),
    recoveredLocks: dryRun ? [] : recoverStaleLocks(),
    prunedMessages: pruneFiles(messagesDir(), RETENTION_MS, dryRun),
    prunedAgents: pruneFiles(agentsDir(), RETENTION_MS, dryRun),
    prunedInspectLogs: pruneInspectLogs(RETENTION_MS, dryRun),
    prunedWorktrees: pruneStaleAgentWorktrees(dryRun),
    worktrees: dryRun ? [] : pruneWorktrees(),
    staleGatewayRefs: gitSoft(["for-each-ref", "--format=%(refname)", "refs/gova-gateway"], process.cwd())
      .split("\n")
      .filter(Boolean),
    // Cleanup is what runs when a batch of work ends, which is exactly when a
    // full swap should be noticed: nothing is holding those pages any more, and
    // leaving them there keeps the admission floor raised for the next batch.
    swap: assessSwap(),
  };
  console.log(JSON.stringify(result, null, 2));
}

main();
