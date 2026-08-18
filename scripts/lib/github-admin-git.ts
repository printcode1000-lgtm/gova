import { execFileSync } from "node:child_process";

const GITHUB_HOST = "github.com";

/**
 * GitHub HTTPS git operations for deploy scripts.
 *
 * Authentication order:
 * 1. `GITHUB_ADMIN_TOKEN` from `.env.local` / `.env` when set.
 * 2. Otherwise GitHub CLI (`gh`) browser login — opens the browser once, then
 *    reuses the stored session via `gh auth token`.
 *
 * Deploy git never uses machine SSH keys, Credential Manager, or `origin`
 * remote credentials. Local `git commit` identity is supplied explicitly so
 * Git never prompts for user.name / user.email.
 */
export function resolveGitHubRepository(cwd: string): string {
  const configured = process.env.GITHUB_REPOSITORY?.trim();
  if (configured) return configured;

  const remote = readGitLocal(cwd, ["remote", "get-url", "origin"]);
  const match = remote.match(/github\.com[/:]([^/]+\/[^/.]+?)(\.git)?$/);
  if (!match) {
    throw new Error(`Could not read owner/repo from origin remote: ${remote}`);
  }
  return match[1];
}

function commandExists(command: string): boolean {
  try {
    if (process.platform === "win32") {
      execFileSync("where", [command], { stdio: "ignore", windowsHide: true });
    } else {
      execFileSync("command", ["-v", command], { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

function ghAuthOk(): boolean {
  try {
    execFileSync("gh", ["auth", "status", "-h", GITHUB_HOST], {
      stdio: "ignore",
      env: noPromptEnv(),
    });
    return true;
  } catch {
    return false;
  }
}

function ensureGhInstalled(): void {
  if (!commandExists("gh")) {
    throw new Error(
      "GitHub CLI (gh) is required when GITHUB_ADMIN_TOKEN is not set. Install it from https://cli.github.com/ then run deploy again — the browser sign-in opens automatically.",
    );
  }
}

function loginGhInBrowser(): void {
  console.log("[deploy] Opening browser for GitHub sign-in...");
  execFileSync(
    "gh",
    ["auth", "login", "-w", "-h", GITHUB_HOST, "-p", "https", "-s", "repo"],
    { stdio: "inherit", env: noPromptEnv() },
  );
}

/**
 * Ensures GitHub credentials exist before any deploy git write.
 * Uses `GITHUB_ADMIN_TOKEN` when set; otherwise launches browser login via `gh`.
 */
export function ensureDeployGitHubAuth(): void {
  if (process.env.GITHUB_ADMIN_TOKEN?.trim()) {
    console.log("[deploy] GitHub git auth: GITHUB_ADMIN_TOKEN from environment.");
    return;
  }

  ensureGhInstalled();
  if (!ghAuthOk()) {
    loginGhInBrowser();
  }
  if (!ghAuthOk()) {
    throw new Error(
      "GitHub browser sign-in did not complete. Run `gh auth login -w` and try deploy again.",
    );
  }
  console.log("[deploy] GitHub git auth: GitHub CLI browser session.");
}

export function readGitHubToken(): string {
  const fromEnv = process.env.GITHUB_ADMIN_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  ensureGhInstalled();
  if (!ghAuthOk()) {
    loginGhInBrowser();
  }
  try {
    return execFileSync("gh", ["auth", "token", "-h", GITHUB_HOST], {
      encoding: "utf8",
      env: noPromptEnv(),
    }).trim();
  } catch {
    throw new Error(
      "Could not read a GitHub token after browser sign-in. Run `gh auth login -w` and try again.",
    );
  }
}

/** @deprecated Use {@link readGitHubToken} — kept for existing imports. */
export function readGitHubAdminToken(): string {
  return readGitHubToken();
}

function noPromptEnv(): NodeJS.ProcessEnv {
  return { ...process.env, GIT_TERMINAL_PROMPT: "0" };
}

function resolveGitIdentity(): { name: string; email: string } {
  const configuredName = process.env.GITHUB_DEPLOY_GIT_NAME?.trim();
  const configuredEmail = process.env.GITHUB_DEPLOY_GIT_EMAIL?.trim();
  if (configuredName && configuredEmail) {
    return { name: configuredName, email: configuredEmail };
  }

  if (commandExists("gh") && ghAuthOk()) {
    try {
      const login = execFileSync("gh", ["api", "user", "-q", ".login"], {
        encoding: "utf8",
        env: noPromptEnv(),
      }).trim();
      if (login) {
        return { name: login, email: `${login}@users.noreply.github.com` };
      }
    } catch {
      // Fall through to the deploy default identity.
    }
  }

  return {
    name: "asol-deploy",
    email: "asol-deploy@users.noreply.github.com",
  };
}

function localGitConfigArgs(): string[] {
  const identity = resolveGitIdentity();
  return [
    "-c",
    "credential.helper=",
    "-c",
    `user.name=${identity.name}`,
    "-c",
    `user.email=${identity.email}`,
  ];
}

/** Local git (status, commit, add) without credential or identity prompts. */
export function readGitLocal(cwd: string, gitArgs: string[]): string {
  return execFileSync("git", [...localGitConfigArgs(), ...gitArgs], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: noPromptEnv(),
  }).trim();
}

export function runGitLocal(cwd: string, gitArgs: string[]): void {
  execFileSync("git", [...localGitConfigArgs(), ...gitArgs], {
    cwd,
    stdio: "inherit",
    env: noPromptEnv(),
  });
}

function gitHttpsUrl(repository: string): string {
  return `https://github.com/${repository}.git`;
}

function runGitWithToken(cwd: string, gitArgs: string[]): void {
  const token = readGitHubToken();
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
      env: noPromptEnv(),
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
  runGitWithToken(input.cwd, ["push", gitHttpsUrl(repository), input.branch]);
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
  runGitWithToken(input.cwd, [
    "fetch",
    gitHttpsUrl(repository),
    `+refs/heads/${input.branch}:refs/remotes/origin/${input.branch}`,
  ]);
}

export const __testables = {
  gitHttpsUrl,
  resolveGitIdentity,
  ghAuthOk,
};
