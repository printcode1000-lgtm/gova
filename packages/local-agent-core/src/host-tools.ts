import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ensureDir, readJsonFile, writeJsonFile } from "./json-store";
import { localRootDir } from "./paths";

export const MANAGED_HOST_TOOL = "antigravity";
const TOOL_ALIASES = ["antigravity", "agy"] as const;

export interface HostToolPolicy {
  antigravity?: { allowed?: boolean };
}

export function hostToolPolicyPath(): string {
  return path.join(localRootDir(), "host-tools.json");
}

export function hostToolShimDir(): string {
  return path.join(localRootDir(), "host-tool-shims");
}

export function readHostToolPolicy(): HostToolPolicy | null {
  return readJsonFile<HostToolPolicy>(hostToolPolicyPath());
}

export function hostToolAllowed(): boolean {
  const policy = readHostToolPolicy();
  return policy?.antigravity?.allowed === true;
}

export function setHostToolAllowed(allowed: boolean): void {
  writeJsonFile(hostToolPolicyPath(), { antigravity: { allowed } });
}

export function toggleHostToolAllowed(): boolean {
  const next = !hostToolAllowed();
  setHostToolAllowed(next);
  return next;
}

export function hostToolState(): { tool: string; allowed: boolean; policyPath: string; shimDir: string } {
  return {
    tool: MANAGED_HOST_TOOL,
    allowed: hostToolAllowed(),
    policyPath: hostToolPolicyPath(),
    shimDir: hostToolShimDir(),
  };
}

export function ensureHostToolShims(): string {
  const dir = ensureDir(hostToolShimDir());
  if (hostToolAllowed()) return dir;
  const body = "#!/bin/sh\nprintf '%s\\n' 'host tool is excluded by .local/host-tools.json' >&2\nexit 127\n";
  for (const name of TOOL_ALIASES) {
    const shimPath = path.join(dir, name);
    if (!existsSync(shimPath)) writeFileSync(shimPath, body, { mode: 0o755 });
  }
  return dir;
}

export function envWithHostToolShims(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  if (hostToolAllowed()) return { ...env };
  const shimDir = ensureHostToolShims();
  return { ...env, PATH: `${shimDir}:${env.PATH ?? ""}` };
}

export function wrapLoginShellCommand(command: string): string {
  if (hostToolAllowed()) return command;
  const shimDir = ensureHostToolShims().replace(/'/g, "'\\''");
  return `PATH='${shimDir}':$PATH; export PATH; ${command}`;
}
