import { writeFileSync } from "node:fs";
import path from "node:path";

import { ensureDir, writeJsonFile } from "./json-store";
import { localRootDir } from "./paths";

export const MANAGED_HOST_TOOL = "antigravity";
const TOOL_ALIASES = ["antigravity", "agy"] as const;
const FORBIDDEN_TOOL_PATTERN = /\b(?:antigravity|agy)\b/i;

export interface HostToolPolicy {
  antigravity?: { allowed?: boolean };
}

export function hostToolPolicyPath(): string {
  return path.join(localRootDir(), "host-tools.json");
}

export function hostToolShimDir(): string {
  return path.join(localRootDir(), "host-tool-shims");
}

/**
 * Antigravity is permanently disabled for the Gova Local Runner.
 *
 * The policy file is retained only as machine-local state for diagnostics and
 * backwards compatibility. Its contents can never enable the tool.
 */
export function readHostToolPolicy(): HostToolPolicy {
  return { antigravity: { allowed: false } };
}

export function hostToolAllowed(): boolean {
  return false;
}

export function setHostToolAllowed(allowed: boolean): void {
  if (allowed) {
    throw new Error("Antigravity/agy is permanently forbidden by Gova Local Runner policy.");
  }
  writeJsonFile(hostToolPolicyPath(), { antigravity: { allowed: false } });
}

export function toggleHostToolAllowed(): never {
  throw new Error("Antigravity/agy cannot be enabled or toggled in the Gova Local Runner.");
}

export function hostToolState(): { tool: string; allowed: boolean; policyPath: string; shimDir: string } {
  return {
    tool: MANAGED_HOST_TOOL,
    allowed: false,
    policyPath: hostToolPolicyPath(),
    shimDir: hostToolShimDir(),
  };
}

export function assertHostToolCommandAllowed(command: string): void {
  if (FORBIDDEN_TOOL_PATTERN.test(command)) {
    throw new Error("Local Runner refused shell_command: Antigravity/agy is permanently forbidden.");
  }
}

export function ensureHostToolShims(): string {
  const dir = ensureDir(hostToolShimDir());
  const body = "#!/bin/sh\nprintf '%s\\n' 'Antigravity/agy is permanently forbidden by Gova Local Runner policy.' >&2\nexit 127\n";
  for (const name of TOOL_ALIASES) {
    writeFileSync(path.join(dir, name), body, { mode: 0o755 });
  }
  return dir;
}

export function envWithHostToolShims(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const shimDir = ensureHostToolShims();
  return { ...env, PATH: `${shimDir}:${env.PATH ?? ""}` };
}

export function wrapLoginShellCommand(command: string): string {
  assertHostToolCommandAllowed(command);
  const shimDir = ensureHostToolShims().replace(/'/g, "'\\''");
  return `PATH='${shimDir}':$PATH; export PATH; ${command}`;
}
