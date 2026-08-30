import { existsSync, lstatSync, statSync } from "node:fs";
import path from "node:path";
import { buildCoordinationSnapshot, git, gitSoft, isSecretPath, listRunners, listRuns, relativeInsideWorkspace, workspaceDir } from "@asol/local-agent-core";
/**
 * Read-only state of the local machine, the runner pool, and the control plane.
 *
 * This runs straight against `/home/hesham/gova` — no checkout, no dependency
 * install — so an agent asking "where is main, who is working, what is locked"
 * pays seconds rather than minutes.
 */

const MAX_PATHS = 10_000;

function requestedPaths(workspace: string): string[] {
  const raw = (process.env.LOCAL_AGENT_STATUS_PATHS || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (raw.includes("__tracked__")) {
    return git(["ls-files"], workspace).split("\n").filter(Boolean).slice(0, MAX_PATHS);
  }
  return raw.slice(0, MAX_PATHS);
}

function localPathStatus(workspace: string, inputPath: string): Record<string, unknown> {
  const relative = relativeInsideWorkspace(inputPath, workspace);
  if (!relative) return { path: inputPath, error: "outside-workspace" };
  const absolute = path.join(workspace, relative);
  if (!existsSync(absolute)) return { path: relative, exists: false };
  const stats = lstatSync(absolute);
  const secretLike = isSecretPath(relative);
  return {
    path: relative,
    exists: true,
    type: stats.isDirectory() ? "directory" : stats.isFile() ? "file" : "other",
    mode: (stats.mode & 0o777).toString(8),
    size: stats.isFile() ? statSync(absolute).size : undefined,
    modified: stats.mtime.toISOString(),
    tracked: gitSoft(["ls-files", "--error-unmatch", relative], workspace).length > 0,
    secretLike,
    content: secretLike ? "redacted" : undefined,
  };
}

async function main(): Promise<void> {
  const workspace = workspaceDir();
  gitSoft(["fetch", "--prune", "origin", "main"], workspace);
  const head = git(["rev-parse", "HEAD"], workspace);
  const originMain = gitSoft(["rev-parse", "origin/main"], workspace);
  const status = gitSoft(["status", "--short", "--branch"], workspace);
  const branch = gitSoft(["branch", "--show-current"], workspace);
  const paths = requestedPaths(workspace);
  const [runners, runs] = await Promise.all([listRunners(), listRuns(10)]);
  const coordination = buildCoordinationSnapshot({ messageLimit: 20, requestLimit: 20, operationLimit: 20 });

  console.log(
    JSON.stringify(
      {
        workspace,
        branch,
        head,
        originMain,
        clean: status === "## main...origin/main",
        status,
        checkedPathCount: paths.length,
        checkedPathLimit: MAX_PATHS,
        checkedPaths: paths.map((item) => localPathStatus(workspace, item)),
        github: {
          runners: { error: runners.error, online: runners.runners.filter((r) => r.status === "online").length, list: runners.runners },
          runs: { error: runs.error, list: runs.runs },
        },
        coordination,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
