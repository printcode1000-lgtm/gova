import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { readJsonFile, writeJsonFile } from "./json-store";
import { localRootDir } from "./paths";

const execFileAsync = promisify(execFile);

export interface RemoteHostProbe {
  alias: string;
  ok: boolean;
  error: string | null;
  hostname: string | null;
  nproc: number | null;
  memAvailableMb: number | null;
  memTotalMb: number | null;
  swapFreeMb: number | null;
  nodeVersion: string | null;
  govaExists: boolean;
  registeredRunners: number;
  probedAt: string;
}

export function remoteHostsCachePath(): string {
  return path.join(localRootDir(), "remote-hosts.json");
}

export function sshAliases(configPath = path.join(homedir(), ".ssh", "config")): string[] {
  if (!existsSync(configPath)) return [];
  const aliases = new Set<string>();
  for (const line of readFileSync(configPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*Host\s+(.+)$/i.exec(line);
    if (!match) continue;
    for (const alias of match[1]!.trim().split(/\s+/)) {
      if (alias && !/[?*]/.test(alias)) aliases.add(alias);
    }
  }
  return [...aliases].sort();
}

function numberField(contents: string, name: string): number | null {
  const match = new RegExp(`^${name}:\\s+(\\d+) kB$`, "m").exec(contents);
  return match ? Math.round(Number(match[1]) / 1024) : null;
}

function parseProbe(alias: string, stdout: string): RemoteHostProbe {
  const values = new Map(stdout.split(/\r?\n/).map((line) => {
    const at = line.indexOf("=");
    return at === -1 ? [line, ""] : [line.slice(0, at), line.slice(at + 1)];
  }));
  const meminfo = values.get("meminfo")?.replaceAll("\\n", "\n") ?? "";
  return {
    alias,
    ok: true,
    error: null,
    hostname: values.get("hostname") || null,
    nproc: Number(values.get("nproc")) || null,
    memAvailableMb: numberField(meminfo, "MemAvailable"),
    memTotalMb: numberField(meminfo, "MemTotal"),
    swapFreeMb: numberField(meminfo, "SwapFree"),
    nodeVersion: values.get("node") || null,
    govaExists: values.get("gova") === "yes",
    registeredRunners: Number(values.get("runners")) || 0,
    probedAt: new Date().toISOString(),
  };
}

export async function probeRemoteHost(alias: string): Promise<RemoteHostProbe> {
  const script = [
    "printf 'hostname=%s\\n' \"$(hostname)\"",
    "printf 'nproc=%s\\n' \"$(nproc 2>/dev/null || printf 0)\"",
    "printf 'meminfo=%s\\n' \"$(grep -E '^(MemAvailable|MemTotal|SwapFree):' /proc/meminfo | sed ':a;N;$!ba;s/\\n/\\\\n/g')\"",
    "printf 'node=%s\\n' \"$(node --version 2>/dev/null || true)\"",
    "test -d ~/gova && printf 'gova=yes\\n' || printf 'gova=no\\n'",
    "printf 'runners=%s\\n' \"$(find ~/gova/.local/github-runners -maxdepth 2 -name .runner 2>/dev/null | wc -l)\"",
  ].join("; ");
  try {
    const { stdout } = await execFileAsync("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=6", alias, script], {
      encoding: "utf8",
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    return parseProbe(alias, stdout);
  } catch (error) {
    return {
      alias,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      hostname: null,
      nproc: null,
      memAvailableMb: null,
      memTotalMb: null,
      swapFreeMb: null,
      nodeVersion: null,
      govaExists: false,
      registeredRunners: 0,
      probedAt: new Date().toISOString(),
    };
  }
}

export async function probeRemoteHosts(): Promise<RemoteHostProbe[]> {
  const results = await Promise.all(sshAliases().map((alias) => probeRemoteHost(alias)));
  writeJsonFile(remoteHostsCachePath(), results);
  return results;
}

export function readRemoteHostsCache(): RemoteHostProbe[] {
  const value = readJsonFile<RemoteHostProbe[]>(remoteHostsCachePath());
  return Array.isArray(value) ? value : [];
}
