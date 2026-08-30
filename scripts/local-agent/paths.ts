import path from "node:path";

/**
 * Canonical filesystem layout of the local agent control plane.
 *
 * `/home/hesham/gova` is the single project root. Everything the runner pool
 * needs at runtime lives under `<workspace>/.local`, which `.gitignore` keeps
 * out of the repository.
 */

export const DEFAULT_WORKSPACE = "/home/hesham/gova";

export function workspaceDir(): string {
  return process.env.GOVA_LOCAL_WORKSPACE?.trim() || DEFAULT_WORKSPACE;
}

export function localRootDir(): string {
  return path.join(workspaceDir(), ".local");
}

export function runnerPoolDir(): string {
  return process.env.GOVA_RUNNER_POOL_DIR?.trim() || path.join(localRootDir(), "github-runners");
}

export function coordinationDir(): string {
  return process.env.GOVA_AGENT_COORDINATION_DIR?.trim() || path.join(runnerPoolDir(), "gova-coordination");
}

export function agentsDir(): string {
  return path.join(coordinationDir(), "agents");
}

export function locksDir(): string {
  return path.join(coordinationDir(), "locks");
}

export function messagesDir(): string {
  return path.join(coordinationDir(), "messages");
}

export function requestsDir(): string {
  return path.join(coordinationDir(), "requests");
}

export function logsDir(): string {
  return path.join(coordinationDir(), "logs");
}

export function operationLogsDir(): string {
  return path.join(logsDir(), "operations");
}

export function inspectLogsDir(): string {
  return path.join(logsDir(), "inspect");
}

export function worktreesDir(): string {
  return path.join(localRootDir(), "agent-worktrees");
}

/** Runner directory names in pool order; index 0 is the unsuffixed runner. */
export const RUNNER_DIRECTORY_NAMES = [
  "gova-runner",
  "gova-runner-2",
  "gova-runner-3",
  "gova-runner-4",
  "gova-runner-5",
  "gova-runner-6",
] as const;

export const RUNNER_SERVICE_NAMES = [
  "gova-github-runner.service",
  "gova-github-runner-2.service",
  "gova-github-runner-3.service",
  "gova-github-runner-4.service",
  "gova-github-runner-5.service",
  "gova-github-runner-6.service",
] as const;

export const RUNNER_GITHUB_NAMES = [
  "gova-local",
  "gova-local-2",
  "gova-local-3",
  "gova-local-4",
  "gova-local-5",
  "gova-local-6",
] as const;

/**
 * Resolve `candidate` against the workspace, refusing anything that escapes it.
 * Returns the workspace-relative path, or null when the target is outside.
 */
export function relativeInsideWorkspace(candidate: string, workspace = workspaceDir()): string | null {
  const resolved = path.resolve(workspace, candidate);
  const relative = path.relative(workspace, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return relative || ".";
}
