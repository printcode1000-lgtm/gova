import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { hostname } from "node:os";
import path from "node:path";

import { RUNNER_DIRECTORY_NAMES, RUNNER_GITHUB_NAMES, RUNNER_SERVICE_NAMES, hostProfile, hostProfileName, runnerPoolDir, workspaceDir } from "./paths";
import { looksLikeSecretValue } from "./secret-paths";

/**
 * Everything the local server depends on that lives *outside* the project.
 *
 * The repository can be recloned; the host cannot. Systemd user units, linger,
 * the runner registrations, and the runner environment files exist only on this
 * machine, and losing them means the pool is gone even though every line of code
 * survived. This module reads that state so it can be written into the
 * repository and replayed onto a rebuilt machine.
 *
 * Registration credentials are deliberately excluded: `.credentials`,
 * `.credentials_rsaparams`, and `.registration-token` are secrets, and a rebuilt
 * runner re-registers with a fresh token rather than replaying an old one.
 */

export const HOST_BACKUP_DIRECTORY = path.join("config", "local-agent-host");
export const SYSTEMD_USER_DIR = path.join(process.env.HOME || "/home/hesham", ".config", "systemd", "user");
export const NEVER_BACKED_UP = [".credentials", ".credentials_rsaparams", ".registration-token"] as const;

export interface RunnerInventory {
  directoryName: string;
  githubName: string;
  serviceName: string;
  installed: boolean;
  runnerVersion: string | null;
  workFolder: string | null;
  labels: string[];
  environmentFile: string | null;
  pathFile: string | null;
}

export interface HostInventory {
  capturedAt: string;
  workspace: string;
  runnerPoolDir: string;
  host: { hostname: string; kernel: string; distribution: string };
  toolchain: { node: string; npm: string; git: string };
  linger: boolean;
  repository: { origin: string; hooksPath: string; credentialHelper: string };
  runners: RunnerInventory[];
  hostProfile: string;
  systemdUnits: Record<string, string>;
}

function capture(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function readTextFile(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Runner environment files are host configuration, not credentials — but they
 * are free-form, so a line that looks like a credential is dropped rather than
 * written into a tracked file.
 */
export function redactEnvironmentFile(contents: string): string {
  return contents
    .split(/\r?\n/)
    .map((line) => (looksLikeSecretValue(line) ? `${line.split("=")[0]}=<redacted>` : line))
    .join("\n");
}

function runnerVersionOf(directory: string): string | null {
  try {
    const archive = execFileSync("sh", ["-c", `ls ${JSON.stringify(directory)} | grep '^actions-runner-.*\\.tar\\.gz$'`], {
      encoding: "utf8",
    }).trim();
    return /actions-runner-linux-x64-([0-9.]+)\.tar\.gz/.exec(archive)?.[1] ?? null;
  } catch {
    return null;
  }
}

function runnerWorkFolder(directory: string): string | null {
  const raw = readTextFile(path.join(directory, ".runner"));
  if (!raw) return null;
  try {
    return (JSON.parse(raw.replace(/^﻿/, "")) as { workFolder?: string }).workFolder ?? null;
  } catch {
    return null;
  }
}

export function collectHostInventory(labelsByRunner: Record<string, string[]> = {}): HostInventory {
  const workspace = workspaceDir();
  const pool = runnerPoolDir();

  const runners: RunnerInventory[] = RUNNER_DIRECTORY_NAMES.map((directoryName, index) => {
    const directory = path.join(pool, directoryName);
    const installed = existsSync(path.join(directory, "run.sh"));
    const githubName = RUNNER_GITHUB_NAMES[index]!;
    return {
      directoryName,
      githubName,
      serviceName: RUNNER_SERVICE_NAMES[index]!,
      installed,
      runnerVersion: installed ? runnerVersionOf(directory) : null,
      workFolder: installed ? runnerWorkFolder(directory) : null,
      labels: labelsByRunner[githubName] ?? ["self-hosted", "Linux", "X64", "gova"],
      environmentFile: installed ? readTextFile(path.join(directory, ".env")) : null,
      pathFile: installed ? readTextFile(path.join(directory, ".path")) : null,
    };
  });

  // Only the runner that was installed from a downloaded archive still has the
  // tarball beside it; the others were copied from it. They all run the same
  // release, so one detected version stands in for the pool — and a version is
  // what restore needs to fetch a replacement.
  const poolVersion = runners.find((runner) => runner.runnerVersion !== null)?.runnerVersion ?? null;
  for (const runner of runners) {
    if (runner.installed && runner.runnerVersion === null) runner.runnerVersion = poolVersion;
  }

  const systemdUnits: Record<string, string> = {};
  for (const serviceName of [hostProfile().sliceName, ...RUNNER_SERVICE_NAMES]) {
    const unitPath = path.join(SYSTEMD_USER_DIR, serviceName);
    const contents = readTextFile(unitPath);
    if (contents) systemdUnits[serviceName] = contents;
  }

  return {
    capturedAt: new Date().toISOString(),
    workspace,
    runnerPoolDir: pool,
    host: {
      hostname: hostname(),
      kernel: capture("uname", ["-r"]),
      distribution: (readTextFile("/etc/os-release") ?? "").match(/^PRETTY_NAME="?([^"\n]+)"?/m)?.[1] ?? "",
    },
    toolchain: {
      node: process.version,
      npm: capture("npm", ["--version"]),
      git: capture("git", ["--version"]),
    },
    linger: capture("loginctl", ["show-user", process.env.USER || "hesham", "-p", "Linger"]) === "Linger=yes",
    repository: {
      origin: capture("git", ["-C", workspace, "remote", "get-url", "origin"]),
      hooksPath: capture("git", ["-C", workspace, "config", "--get", "core.hooksPath"]),
      credentialHelper: capture("git", ["-C", workspace, "config", "--local", "--get", "credential.helper"]),
    },
    runners,
    hostProfile: hostProfileName(),
    systemdUnits,
  };
}

/** Secret files that must never be copied into the backup, with their live presence. */
export function excludedSecretFiles(): Array<{ path: string; present: boolean; mode: string | null }> {
  const pool = runnerPoolDir();
  const found: Array<{ path: string; present: boolean; mode: string | null }> = [];
  for (const directoryName of RUNNER_DIRECTORY_NAMES) {
    for (const name of NEVER_BACKED_UP) {
      const filePath = path.join(pool, directoryName, name);
      const present = existsSync(filePath);
      found.push({
        path: path.join(directoryName, name),
        present,
        mode: present ? (statSync(filePath).mode & 0o777).toString(8) : null,
      });
    }
  }
  return found;
}
