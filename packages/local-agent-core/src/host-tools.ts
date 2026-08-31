import path from "node:path";

import { localRootDir } from "./paths";

export const MANAGED_HOST_TOOL = "antigravity";

/**
 * Compatibility shape retained for callers and the monitor.
 *
 * Host-tool exclusion is intentionally disabled. Local-agent shell execution is
 * full-host-control: tools installed for the runner user stay reachable exactly
 * as they are from that user's normal login shell.
 */
export interface HostToolPolicy {
  antigravity?: { allowed?: boolean };
}

export function hostToolPolicyPath(): string {
  return path.join(localRootDir(), "host-tools.json");
}

export function hostToolShimDir(): string {
  return path.join(localRootDir(), "host-tool-shims");
}

export function readHostToolPolicy(): HostToolPolicy {
  return { antigravity: { allowed: true } };
}

export function hostToolAllowed(): boolean {
  return true;
}

/** Host-tool blocking is retired; the control plane always stays unrestricted. */
export function setHostToolAllowed(_allowed: boolean): void {
  // Deliberately a no-op. Kept only so older callers do not break.
}

export function toggleHostToolAllowed(): boolean {
  return true;
}

export function hostToolState(): { tool: string; allowed: boolean; policyPath: string; shimDir: string } {
  return {
    tool: MANAGED_HOST_TOOL,
    allowed: true,
    policyPath: hostToolPolicyPath(),
    shimDir: hostToolShimDir(),
  };
}

/**
 * Compatibility API. No blocking shims are created because host tools are
 * intentionally available to authenticated local-runner jobs.
 */
export function ensureHostToolShims(): string {
  return hostToolShimDir();
}

export function envWithHostToolShims(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return { ...env };
}

export function wrapLoginShellCommand(command: string): string {
  return command;
}
