import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { runCapture } from "./git";
import { workspaceDir } from "./paths";

/**
 * Publication of coordination state to a branch cloud agents can read.
 *
 * `agent-control` is an output-only orphan branch: it carries nothing but JSON
 * state, it is written through git plumbing so no checkout is disturbed, and it
 * is force-updated because only the newest snapshot matters. Keeping it off
 * `main` is the point — coordination traffic must never enter the branch whose
 * pushes deploy production.
 */

export const CONTROL_BRANCH = "agent-control";
export const SNAPSHOT_FILE = "coordination-status.json";

export interface PublishResult {
  published: boolean;
  commit: string | null;
  error: string | null;
}

/**
 * Write `files` as the entire content of the control branch and force-push it.
 *
 * A temporary index keeps the operation invisible to the repository's real
 * index, so this is safe to call while a developer or another agent is working.
 */
export function publishControlBranch(files: Record<string, string>, message: string): PublishResult {
  const root = workspaceDir();
  const scratch = mkdtempSync(path.join(tmpdir(), "gova-control-branch-"));
  const indexFile = path.join(scratch, "index");

  const git = (args: string[]): { status: number; stdout: string; stderr: string } => {
    const previous = process.env.GIT_INDEX_FILE;
    process.env.GIT_INDEX_FILE = indexFile;
    try {
      return runCapture("git", args, root);
    } finally {
      if (previous === undefined) delete process.env.GIT_INDEX_FILE;
      else process.env.GIT_INDEX_FILE = previous;
    }
  };

  try {
    const emptied = git(["read-tree", "--empty"]);
    if (emptied.status !== 0) return { published: false, commit: null, error: emptied.stderr };

    for (const [relativePath, contents] of Object.entries(files)) {
      const blobPath = path.join(scratch, "blob");
      writeFileSync(blobPath, contents, { mode: 0o600 });
      const hashed = git(["hash-object", "-w", blobPath]);
      if (hashed.status !== 0) return { published: false, commit: null, error: hashed.stderr };
      const added = git(["update-index", "--add", "--cacheinfo", `100644,${hashed.stdout},${relativePath}`]);
      if (added.status !== 0) return { published: false, commit: null, error: added.stderr };
    }

    const tree = git(["write-tree"]);
    if (tree.status !== 0) return { published: false, commit: null, error: tree.stderr };

    const commit = git([
      "-c",
      "user.name=gova-local-agent",
      "-c",
      "user.email=gova-local-agent@users.noreply.github.com",
      "commit-tree",
      tree.stdout,
      "-m",
      message,
    ]);
    if (commit.status !== 0) return { published: false, commit: null, error: commit.stderr };

    const pushed = runCapture(
      "git",
      ["push", "--force", "origin", `${commit.stdout}:refs/heads/${CONTROL_BRANCH}`],
      root,
    );
    if (pushed.status !== 0) return { published: false, commit: commit.stdout, error: pushed.stderr };
    return { published: true, commit: commit.stdout, error: null };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
