import { execFileSync } from "node:child_process";
import { existsSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

export const RELEASE_SCRATCH_FILE_PATTERNS = [
  /(^|\/)__probe/i,
  /\.(log|tmp|bak|orig|rej)$/i,
  /(^|\/)scratchpad\//i,
  /(^|\/)\.DS_Store$/,
] as const;

export function releaseGit(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

export function assertReleaseMainBranch(cwd: string, command: string): void {
  const branch = releaseGit(cwd, ["branch", "--show-current"]);
  if (branch !== "main") {
    throw new Error(`${command} must run from main; current branch is ${branch || "detached HEAD"}.`);
  }
}

export function releaseChangedPaths(cwd: string): string[] {
  return releaseGit(cwd, ["status", "--porcelain"])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim());
}

export function assertNoReleaseScratchFiles(input: {
  readonly cwd: string;
  readonly allowScratchFiles: boolean;
}): string[] {
  const paths = releaseChangedPaths(input.cwd);
  const scratch = paths.filter((entry) => RELEASE_SCRATCH_FILE_PATTERNS.some((pattern) => pattern.test(entry)));
  if (scratch.length > 0 && !input.allowScratchFiles) {
    throw new Error(
      "Refusing to publish scratch files:\n" +
        scratch.map((entry) => `  - ${entry}`).join("\n") +
        "\nRemove them, or pass --allow-scratch-files if they are intentional.",
    );
  }
  return paths;
}

function hasRunningGitProcess(): boolean {
  try {
    if (process.platform === "win32") {
      const output = execFileSync("tasklist", ["/FI", "IMAGENAME eq git.exe", "/FO", "CSV", "/NH"], {
        encoding: "utf8",
        windowsHide: true,
      });
      return /"git\.exe"/i.test(output);
    }
    return execFileSync("pgrep", ["-x", "git"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim().length > 0;
  } catch {
    return false;
  }
}

/** Removes only an abandoned lock; fresh or active locks fail closed. */
export function clearStaleReleaseGitIndexLock(input: {
  readonly cwd: string;
  readonly command: string;
  readonly staleAgeMs?: number;
  readonly onRemoved?: (ageSeconds: number) => void;
}): void {
  const lock = path.join(input.cwd, ".git", "index.lock");
  if (!existsSync(lock)) return;
  const ageMs = Date.now() - statSync(lock).mtimeMs;
  if (ageMs < (input.staleAgeMs ?? 2 * 60 * 1000) || hasRunningGitProcess()) {
    throw new Error(`Git index.lock is active. Close the other Git operation and run ${input.command} again.`);
  }
  unlinkSync(lock);
  input.onRemoved?.(Math.round(ageMs / 1000));
}
