import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import path from "node:path";

import { git, gitLines, gitSoft, runCapture } from "./git";
import { safeIdentifier } from "./json-store";
import { workspaceDir, worktreesDir } from "./paths";

/**
 * Isolated git worktrees for mutating agents.
 *
 * `/home/hesham/gova` stays the one real clone: it owns the object store, the
 * remotes, and `node_modules`. Every mutation runs in a detached worktree under
 * `.local/agent-worktrees`, so parallel agents never share a checkout and the
 * developer's own working tree is never reset out from under them. Detached
 * heads are deliberate — a branch checked out in one worktree cannot be checked
 * out in another, and detaching sidesteps that entirely.
 */

export const MAIN_WORKTREE_SLUG = "__main";

export function worktreeSlug(targetMode: string, agentId: string): string {
  return targetMode === "main" ? MAIN_WORKTREE_SLUG : safeIdentifier(agentId, 48) || "agent";
}

export function worktreePath(slug: string): string {
  return path.join(worktreesDir(), slug);
}

function linkNodeModules(worktree: string): void {
  const link = path.join(worktree, "node_modules");
  if (existsSync(link)) return;
  const target = path.join(workspaceDir(), "node_modules");
  if (!existsSync(target)) return;
  try {
    symlinkSync(target, link, "dir");
  } catch {
    // A concurrent run created it first; either way the link now exists.
  }
}

/**
 * Materialise a clean worktree pinned to the freshest `origin/main`.
 *
 * The worktree is reused across runs of the same agent, which keeps the common
 * case to a fetch and a reset instead of a 440MB checkout.
 */
export function prepareWorktree(slug: string): { worktree: string; baseSha: string } {
  const root = workspaceDir();
  mkdirSync(worktreesDir(), { recursive: true });
  git(["fetch", "--prune", "origin", "main"], root);
  const baseSha = git(["rev-parse", "origin/main"], root);
  const worktree = worktreePath(slug);

  if (!existsSync(path.join(worktree, ".git"))) {
    if (existsSync(worktree)) rmSync(worktree, { recursive: true, force: true });
    gitSoft(["worktree", "prune"], root);
    git(["worktree", "add", "--detach", worktree, baseSha], root);
  } else {
    git(["fetch", "--prune", "origin", "main"], worktree);
    git(["checkout", "--detach", baseSha], worktree);
    git(["reset", "--hard", baseSha], worktree);
    git(["clean", "-fd"], worktree);
  }
  linkNodeModules(worktree);
  return { worktree, baseSha };
}

/** Remove worktrees whose directory is gone and drop stale administrative files. */
export function pruneWorktrees(): string[] {
  const root = workspaceDir();
  gitSoft(["worktree", "prune"], root);
  return gitLines(["worktree", "list", "--porcelain"], root)
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length));
}

export function removeWorktree(slug: string): boolean {
  const root = workspaceDir();
  const worktree = worktreePath(slug);
  if (!existsSync(worktree)) return false;
  const result = runCapture("git", ["worktree", "remove", "--force", worktree], root);
  if (result.status !== 0) rmSync(worktree, { recursive: true, force: true });
  gitSoft(["worktree", "prune"], root);
  return true;
}
