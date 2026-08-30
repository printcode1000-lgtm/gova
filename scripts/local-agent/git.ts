import { spawnSync } from "node:child_process";

/** Thin, typed wrapper around git and shell execution for the control plane. */

export interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

export function runCapture(command: string, args: string[], cwd: string): RunResult {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

export function git(args: string[], cwd: string): string {
  const result = runCapture("git", args, cwd);
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed in ${cwd}: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

/** Same as `git`, but an expected non-zero exit yields an empty string. */
export function gitSoft(args: string[], cwd: string): string {
  const result = runCapture("git", args, cwd);
  return result.status === 0 ? result.stdout : "";
}

export function gitLines(args: string[], cwd: string): string[] {
  return gitSoft(args, cwd).split("\n").map((line) => line.trim()).filter(Boolean);
}
