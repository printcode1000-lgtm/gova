import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const GITHUB_HOST = "github.com";

let ghExecutableCache: string | undefined;
let gitExecutableCache: string | undefined;

/**
 * GitHub HTTPS git operations for deploy scripts.
 *
 * Push and fetch always authenticate through GitHub CLI (`gh`) browser login.
 * `GITHUB_ADMIN_TOKEN` is **not** used for deploy git — it remains for
 * `github:protect` API calls only.
 *
 * Local `git commit` identity is supplied explicitly so Git never prompts for
 * user.name / user.email.
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

function standardGitCandidates(): string[] {
  if (process.platform !== "win32") return [];

  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env["ProgramFiles(x86)"];
  const localAppData = process.env.LOCALAPPDATA;
  return [
    process.env.GIT_CLI_PATH?.trim(),
    programFiles ? path.join(programFiles, "Git", "cmd", "git.exe") : undefined,
    programFiles ? path.join(programFiles, "Git", "bin", "git.exe") : undefined,
    programFilesX86 ? path.join(programFilesX86, "Git", "cmd", "git.exe") : undefined,
    localAppData ? path.join(localAppData, "Programs", "Git", "cmd", "git.exe") : undefined,
  ].filter((candidate): candidate is string => Boolean(candidate));
}

/** Resolves `git` even when VS Code / the debugger PATH omits Git for Windows. */
export function resolveGitExecutable(): string {
  if (gitExecutableCache) return gitExecutableCache;

  const fromEnv = process.env.GIT_CLI_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) {
    gitExecutableCache = fromEnv;
    return fromEnv;
  }

  try {
    if (process.platform === "win32") {
      const output = execFileSync("where", ["git"], {
        encoding: "utf8",
        windowsHide: true,
      }).trim();
      const first = output.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim();
      if (first && existsSync(first)) {
        gitExecutableCache = first;
        return first;
      }
    } else {
      const resolved = execFileSync("command", ["-v", "git"], { encoding: "utf8" }).trim();
      if (resolved) {
        gitExecutableCache = resolved;
        return resolved;
      }
    }
  } catch {
    // Fall through to standard install locations.
  }

  for (const candidate of standardGitCandidates()) {
    if (existsSync(candidate)) {
      gitExecutableCache = candidate;
      return candidate;
    }
  }

  if (commandExists("git")) {
    gitExecutableCache = "git";
    return "git";
  }

  gitExecutableCache = "git";
  return "git";
}

export function gitInstalled(): boolean {
  const git = resolveGitExecutable();
  return git !== "git" || commandExists("git");
}

export function ensureDeployGitAvailable(): void {
  if (!gitInstalled()) {
    throw new Error(
      "Git was not found. Install Git for Windows from https://git-scm.com/ — typical path: C:\\Program Files\\Git\\cmd\\git.exe. Restart VS Code after install.",
    );
  }
}

function standardGhCandidates(): string[] {
  if (process.platform !== "win32") return [];

  const localAppData = process.env.LOCALAPPDATA;
  const programFiles = process.env.ProgramFiles;
  return [
    process.env.GH_CLI_PATH?.trim(),
    programFiles ? path.join(programFiles, "GitHub CLI", "gh.exe") : undefined,
    localAppData ? path.join(localAppData, "Programs", "GitHub CLI", "gh.exe") : undefined,
    "C:\\Program Files\\GitHub CLI\\gh.exe",
  ].filter((candidate): candidate is string => Boolean(candidate));
}

/** Resolves `gh` even when PATH was not refreshed after winget install. */
export function resolveGhExecutable(): string {
  if (ghExecutableCache) return ghExecutableCache;

  const fromEnv = process.env.GH_CLI_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) {
    ghExecutableCache = fromEnv;
    return fromEnv;
  }

  try {
    if (process.platform === "win32") {
      const output = execFileSync("where", ["gh"], {
        encoding: "utf8",
        windowsHide: true,
      }).trim();
      const first = output.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim();
      if (first && existsSync(first)) {
        ghExecutableCache = first;
        return first;
      }
    } else {
      const resolved = execFileSync("command", ["-v", "gh"], { encoding: "utf8" }).trim();
      if (resolved) {
        ghExecutableCache = resolved;
        return resolved;
      }
    }
  } catch {
    // Fall through to standard install locations.
  }

  for (const candidate of standardGhCandidates()) {
    if (existsSync(candidate)) {
      ghExecutableCache = candidate;
      return candidate;
    }
  }

  if (commandExists("gh")) {
    ghExecutableCache = "gh";
    return "gh";
  }

  ghExecutableCache = "gh";
  return "gh";
}

const GH_SUBPROCESS_TIMEOUT_MS = 10_000;
const GH_LOGIN_TIMEOUT_MS = 10 * 60_000;

export function ghInstalled(): boolean {
  const gh = resolveGhExecutable();
  return gh !== "gh" || commandExists("gh");
}

function runGh(
  args: string[],
  options: {
    cwd?: string;
    encoding?: BufferEncoding;
    stdio?: "inherit" | "ignore" | ["ignore", "pipe", "inherit"] | ["pipe", "inherit", "inherit"];
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  } = {},
): string | undefined {
  const result = execFileSync(resolveGhExecutable(), args, {
    cwd: options.cwd,
    encoding: options.encoding,
    stdio: options.stdio ?? (options.encoding ? ["ignore", "pipe", "inherit"] : "inherit"),
    env: options.env ?? isolatedGitEnv(),
    windowsHide: true,
    timeout: options.timeoutMs ?? GH_SUBPROCESS_TIMEOUT_MS,
  });
  return typeof result === "string" ? result.trim() : undefined;
}

function ghAuthOk(): boolean {
  try {
    execFileSync(resolveGhExecutable(), ["auth", "status", "-h", GITHUB_HOST], {
      stdio: "ignore",
      env: baseIsolatedGitEnv(),
      timeout: GH_SUBPROCESS_TIMEOUT_MS,
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}

function ensureGhInstalled(): void {
  if (!ghInstalled()) {
    throw new Error(
      "GitHub CLI (gh) was not found. Install with: winget install GitHub.cli — then restart VS Code or open a new terminal so PATH picks up gh. Typical path: C:\\Program Files\\GitHub CLI\\gh.exe",
    );
  }
}

function loginGhInBrowser(): void {
  console.log("[deploy] Opening browser for GitHub sign-in (no username/password dialog)...");
  execFileSync(
    resolveGhExecutable(),
    ["auth", "login", "-w", "-h", GITHUB_HOST, "-p", "https", "-s", "repo"],
    {
      stdio: "inherit",
      env: baseIsolatedGitEnv(),
      timeout: GH_LOGIN_TIMEOUT_MS,
      windowsHide: true,
    },
  );
}

/** Ensures an active `gh` browser session before deploy git network operations. */
export function ensureDeployGitHubAuth(): void {
  ensureDeployGitAvailable();
  ensureGhInstalled();
  if (!ghAuthOk()) {
    loginGhInBrowser();
  }
  if (!ghAuthOk()) {
    throw new Error(
      "GitHub browser sign-in did not complete. Run `gh auth login -w` and try deploy again.",
    );
  }
  console.log("[deploy] GitHub git auth: GitHub CLI browser session (gh).");
}

export function readGitHubToken(): string {
  ensureGhInstalled();
  if (!ghAuthOk()) {
    loginGhInBrowser();
  }
  try {
    return runGh(["auth", "token", "-h", GITHUB_HOST], { encoding: "utf8" }) ?? "";
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

function baseIsolatedGitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GCM_INTERACTIVE: "Never",
    GCM_GUI_PROMPT: "Never",
  };
  if (process.platform === "win32") {
    env.GIT_CONFIG_GLOBAL = "NUL";
    env.GIT_CONFIG_SYSTEM = "NUL";
  } else {
    env.GIT_CONFIG_GLOBAL = "/dev/null";
    env.GIT_CONFIG_SYSTEM = "/dev/null";
  }

  const gh = resolveGhExecutable();
  if (gh.includes(path.sep)) {
    const ghDir = path.dirname(gh);
    env.PATH = `${ghDir};${env.PATH ?? ""}`;
    env.GH_CLI_PATH = gh;
  }

  const git = resolveGitExecutable();
  if (git.includes(path.sep)) {
    const gitDir = path.dirname(git);
    env.PATH = `${gitDir};${env.PATH ?? ""}`;
    env.GIT_CLI_PATH = git;
  }
  return env;
}

function isolatedGitEnv(): NodeJS.ProcessEnv {
  const env = baseIsolatedGitEnv();
  try {
    env.GH_TOKEN = execFileSync(resolveGhExecutable(), ["auth", "token", "-h", GITHUB_HOST], {
      encoding: "utf8",
      env: baseIsolatedGitEnv(),
      timeout: GH_SUBPROCESS_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    }).trim();
  } catch {
    // Not signed in yet — browser login or credential helper will run later.
  }
  return env;
}

function ghCredentialHelperConfig(): string {
  const gh = resolveGhExecutable();
  if (gh.includes(" ")) {
    return `!\\"${gh}\\" auth git-credential`;
  }
  return `!${gh} auth git-credential`;
}

function networkGitConfigArgs(): string[] {
  return [
    "-c",
    "credential.helper=",
    "-c",
    `credential.helper=${ghCredentialHelperConfig()}`,
    "-c",
    "credential.useHttpPath=true",
    "-c",
    "credential.interactive=never",
  ];
}

function resolveGitIdentity(): { name: string; email: string } {
  const configuredName = process.env.GITHUB_DEPLOY_GIT_NAME?.trim();
  const configuredEmail = process.env.GITHUB_DEPLOY_GIT_EMAIL?.trim();
  if (configuredName && configuredEmail) {
    return { name: configuredName, email: configuredEmail };
  }

  if (ghInstalled()) {
    try {
      const login = execFileSync(resolveGhExecutable(), ["api", "user", "-q", ".login"], {
        encoding: "utf8",
        env: baseIsolatedGitEnv(),
        timeout: GH_SUBPROCESS_TIMEOUT_MS,
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
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
  return execFileSync(resolveGitExecutable(), [...localGitConfigArgs(), ...gitArgs], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: isolatedGitEnv(),
  }).trim();
}

export function runGitLocal(cwd: string, gitArgs: string[]): void {
  execFileSync(resolveGitExecutable(), [...localGitConfigArgs(), ...gitArgs], {
    cwd,
    stdio: "inherit",
    env: isolatedGitEnv(),
  });
}

function gitHttpsUrl(repository: string): string {
  return `https://github.com/${repository}.git`;
}

function runGitNetwork(cwd: string, gitArgs: string[]): void {
  ensureDeployGitHubAuth();
  const token = readGitHubToken();
  execFileSync(resolveGitExecutable(), [
    "-c",
    "credential.helper=",
    "-c",
    `http.extraHeader=AUTHORIZATION: bearer ${token}`,
    ...gitArgs,
  ], {
    cwd,
    stdio: "inherit",
    env: isolatedGitEnv(),
    windowsHide: true,
  });
}

/** Pushes a branch to GitHub via `gh` browser credentials. */
export function pushBranchWithAdminToken(input: {
  cwd: string;
  branch: string;
  repository?: string;
}): void {
  const repository = input.repository ?? resolveGitHubRepository(input.cwd);
  runGitNetwork(input.cwd, ["push", gitHttpsUrl(repository), input.branch]);
}

/**
 * Updates `refs/remotes/origin/<branch>` from GitHub via `gh` browser credentials.
 */
export function fetchBranchWithAdminToken(input: {
  cwd: string;
  branch: string;
  repository?: string;
}): void {
  const repository = input.repository ?? resolveGitHubRepository(input.cwd);
  runGitNetwork(input.cwd, [
    "fetch",
    gitHttpsUrl(repository),
    `+refs/heads/${input.branch}:refs/remotes/origin/${input.branch}`,
  ]);
}

export const __testables = {
  gitHttpsUrl,
  resolveGitIdentity,
  ghAuthOk,
  ghCredentialHelperConfig,
  isolatedGitEnv,
  resolveGhExecutable,
  ghInstalled,
  resolveGitExecutable,
  gitInstalled,
};
