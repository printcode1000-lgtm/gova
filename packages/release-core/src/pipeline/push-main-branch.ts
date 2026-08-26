import { execFileSync } from "node:child_process";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function resolveGitHubRepoSlug(cwd: string): string {
  const fromEnv = process.env.GITHUB_REPOSITORY?.trim();
  if (fromEnv) return fromEnv;

  const remote = git(cwd, ["remote", "get-url", "origin"]);
  const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
  if (!match?.[1]) {
    throw new Error(
      "Could not resolve the GitHub repository slug from origin or GITHUB_REPOSITORY.",
    );
  }
  return match[1];
}

function setOriginUrl(cwd: string, url: string): void {
  execFileSync("git", ["remote", "set-url", "origin", url], {
    cwd,
    stdio: "ignore",
  });
}

/**
 * Push `main` (or another branch) to GitHub. When the normal remote has no
 * write credential, temporarily configure the token-backed origin so errors
 * never include a credential-bearing command argument.
 */
export function pushMainBranch(
  cwd: string,
  branch: string,
  logPrefix = "deploy",
): void {
  try {
    execFileSync("git", ["push", "origin", branch], {
      cwd,
      stdio: "inherit",
    });
    return;
  } catch (firstError) {
    const adminToken = process.env.GITHUB_ADMIN_TOKEN?.trim();
    if (!adminToken) throw firstError;

    const slug = resolveGitHubRepoSlug(cwd);
    const pushUrl = `https://x-access-token:${adminToken}@github.com/${slug}.git`;
    console.warn(
      `[${logPrefix}] origin push was rejected; retrying with the configured GitHub credential.`,
    );
    const originalUrl = git(cwd, ["remote", "get-url", "origin"]);
    setOriginUrl(cwd, pushUrl);
    try {
      execFileSync("git", ["push", "origin", branch], {
        cwd,
        stdio: "inherit",
      });
    } finally {
      setOriginUrl(cwd, originalUrl);
    }
  }
}
