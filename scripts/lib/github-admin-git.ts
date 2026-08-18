import { execFileSync } from "node:child_process";

/**
 * GitHub HTTPS git operations for deploy scripts.
 *
 * Deploy commands must not rely on machine SSH keys, Credential Manager, or
 * `origin` remote credentials. They read `GITHUB_ADMIN_TOKEN` from the loaded
 * environment (`.env.local` / `.env`) and pass it only through Git's
 * `http.extraHeader` for the single request.
 */
export function resolveGitHubRepository(cwd: string): string {
  const configured = process.env.GITHUB_REPOSITORY?.trim();
  if (configured) return configured;

  const remote = execFileSync("git", ["remote", "get-url", "origin"], {
    cwd,
    encoding: "utf8",
  }).trim();
  const match = remote.match(/github\.com[/:]([^/]+\/[^/.]+?)(\.git)?$/);
  if (!match) {
    throw new Error(`Could not read owner/repo from origin remote: ${remote}`);
  }
  return match[1];
}

export function readGitHubAdminToken(): string {
  const token = process.env.GITHUB_ADMIN_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "GITHUB_ADMIN_TOKEN is required for deploy git operations. Set it in .env.local — see docs/01-architecture/data-layers/14-environment-variables.md.",
    );
  }
  return token;
}

function gitHttpsUrl(repository: string): string {
  return `https://github.com/${repository}.git`;
}

function runGitWithAdminToken(cwd: string, gitArgs: string[]): void {
  const token = readGitHubAdminToken();
  execFileSync(
    "git",
    [
      "-c",
      "credential.helper=",
      "-c",
      `http.extraHeader=AUTHORIZATION: bearer ${token}`,
      ...gitArgs,
    ],
    {
      cwd,
      stdio: "inherit",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    },
  );
}

/** Pushes a branch to GitHub without using local `origin` credentials. */
export function pushBranchWithAdminToken(input: {
  cwd: string;
  branch: string;
  repository?: string;
}): void {
  const repository = input.repository ?? resolveGitHubRepository(input.cwd);
  runGitWithAdminToken(input.cwd, ["push", gitHttpsUrl(repository), input.branch]);
}

/**
 * Updates `refs/remotes/origin/<branch>` from GitHub without using local
 * `origin` credentials — used to verify a push landed.
 */
export function fetchBranchWithAdminToken(input: {
  cwd: string;
  branch: string;
  repository?: string;
}): void {
  const repository = input.repository ?? resolveGitHubRepository(input.cwd);
  runGitWithAdminToken(input.cwd, [
    "fetch",
    gitHttpsUrl(repository),
    `+refs/heads/${input.branch}:refs/remotes/origin/${input.branch}`,
  ]);
}

export const __testables = {
  gitHttpsUrl,
};
