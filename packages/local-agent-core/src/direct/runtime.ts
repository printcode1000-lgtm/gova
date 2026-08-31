import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ensureDirectDir, DIRECT_FILE_MODE, directAgentDir, directStatePath } from "./paths";

export interface DirectDaemonState {
  schemaVersion: 1;
  pid: number;
  running: boolean;
  hostId: string;
  port: number;
  bindHost: string;
  serverKeyId: string;
  startedAt: string;
  updatedAt: string;
  discoveryLastPublishedAt: string | null;
  bootstrapLastCycleAt: string | null;
  lastError: string | null;
}

export function writeDirectDaemonState(state: DirectDaemonState): void {
  ensureDirectDir(directAgentDir());
  writeFileSync(directStatePath(), `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: DIRECT_FILE_MODE });
}

export function readDirectDaemonState(): DirectDaemonState | null {
  if (!existsSync(directStatePath())) return null;
  try {
    return JSON.parse(readFileSync(directStatePath(), "utf8")) as DirectDaemonState;
  } catch {
    return null;
  }
}

export function directProcessIsAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export function directDaemonStateIsLive(state: DirectDaemonState | null): boolean {
  return Boolean(state?.running && directProcessIsAlive(state.pid));
}

export const DIRECT_SYSTEMD_UNIT_NAME = "gova-direct-agent.service";
export const DIRECT_DISCOVERY_REFRESH_MS = 3 * 60 * 1000;
export const DIRECT_BOOTSTRAP_POLL_MS = 5 * 1000;

export function renderDirectSystemdUnit(workspace: string, envFile: string): string {
  const escapedWorkspace = workspace.replace(/'/g, "'\\''");
  return `[Unit]\nDescription=Gova Direct P2P Agent\nAfter=network-online.target\nWants=network-online.target\n\n[Service]\nType=simple\nWorkingDirectory=${workspace}\nEnvironment=GOVA_LOCAL_WORKSPACE=${workspace}\nEnvironmentFile=-${envFile}\nExecStart=/usr/bin/bash -lc 'cd ${escapedWorkspace} && exec npm run -s local-agent:direct:daemon'\nRestart=on-failure\nRestartSec=5s\nTimeoutStopSec=20s\nKillMode=mixed\nNoNewPrivileges=false\n\n[Install]\nWantedBy=default.target\n`;
}
