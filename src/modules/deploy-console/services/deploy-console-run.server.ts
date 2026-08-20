import "server-only";

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import type { BuiltDeployCommands } from "../domain/build-commands";

const STATE_DIR = path.join(process.cwd(), ".deploy-console");
const STATE_PATH = path.join(STATE_DIR, "current.json");
const LOG_PATH = path.join(STATE_DIR, "current.log");

export type DeployConsoleRunStatus = "running" | "succeeded" | "failed";

export interface DeployConsoleRunState {
  runId: string;
  status: DeployConsoleRunStatus;
  pid: number;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number | null;
  engine: BuiltDeployCommands["engine"];
  commands: string[];
  summaryLines: string[];
}

function ensureDir(): void {
  mkdirSync(STATE_DIR, { recursive: true });
}

function isPidAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function readDeployConsoleRunState(): DeployConsoleRunState | null {
  if (!existsSync(STATE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as DeployConsoleRunState;
  } catch {
    return null;
  }
}

function writeState(state: DeployConsoleRunState): void {
  ensureDir();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function refreshStatus(state: DeployConsoleRunState): DeployConsoleRunState {
  if (state.status !== "running") return state;
  if (isPidAlive(state.pid)) return state;

  const log = existsSync(LOG_PATH) ? readFileSync(LOG_PATH, "utf8") : "";
  const exitMatch = /\[deploy-console\] EXIT_CODE=(\d+)/.exec(log);
  const exitCode = exitMatch ? Number(exitMatch[1]) : 1;
  const next: DeployConsoleRunState = {
    ...state,
    status: exitCode === 0 ? "succeeded" : "failed",
    exitCode,
    finishedAt: new Date().toISOString(),
  };
  writeState(next);
  return next;
}

export function getActiveDeployConsoleRun(): DeployConsoleRunState | null {
  const state = readDeployConsoleRunState();
  if (!state) return null;
  return refreshStatus(state);
}

export function readDeployConsoleLog(offset = 0): {
  text: string;
  nextOffset: number;
  hasMore: boolean;
  run: DeployConsoleRunState | null;
} {
  const run = getActiveDeployConsoleRun();
  if (!existsSync(LOG_PATH)) {
    return { text: "", nextOffset: offset, hasMore: false, run };
  }
  const full = readFileSync(LOG_PATH, "utf8");
  const safeOffset = Math.max(0, Math.min(offset, full.length));
  const text = full.slice(safeOffset);
  return {
    text,
    nextOffset: full.length,
    hasMore: run?.status === "running",
    run,
  };
}

/**
 * Starts the deploy command sequence in a detached OS process.
 * Output is appended to `.deploy-console/current.log` for the page to poll.
 */
export function startDetachedDeployRun(
  built: BuiltDeployCommands,
): DeployConsoleRunState {
  const active = getActiveDeployConsoleRun();
  if (active?.status === "running" && isPidAlive(active.pid)) {
    throw new Error("deployConsoleRunActive");
  }

  ensureDir();
  const runId = `run-${Date.now()}`;
  const startedAt = new Date().toISOString();

  const header = [
    `[deploy-console] runId=${runId}`,
    `[deploy-console] startedAt=${startedAt}`,
    `[deploy-console] engine=${built.engine}`,
    ...built.summaryLines.map((line) => `[deploy-console] ${line}`),
    `[deploy-console] ---`,
    "",
  ].join("\n");
  writeFileSync(LOG_PATH, header, "utf8");

  const root = process.cwd();
  const chained = built.commands.join(" && ");
  const logAbs = LOG_PATH;

  let child;
  if (process.platform === "win32") {
    const script =
      `cd /d "${root}" && (` +
      `${chained}` +
      `) >> "${logAbs}" 2>&1 & echo [deploy-console] EXIT_CODE=%ERRORLEVEL%>> "${logAbs}"`;
    child = spawn("cmd.exe", ["/c", script], {
      cwd: root,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    const script =
      `cd ${shellQuote(root)} && { ${chained} ; code=$?; ` +
      `echo "[deploy-console] EXIT_CODE=$code" >> ${shellQuote(logAbs)}; exit $code; } ` +
      `>> ${shellQuote(logAbs)} 2>&1`;
    child = spawn("bash", ["-lc", script], {
      cwd: root,
      detached: true,
      stdio: "ignore",
    });
  }

  if (!child.pid) {
    throw new Error("deployConsoleSpawnFailed");
  }

  child.unref();

  const state: DeployConsoleRunState = {
    runId,
    status: "running",
    pid: child.pid,
    startedAt,
    engine: built.engine,
    commands: [...built.commands],
    summaryLines: [...built.summaryLines],
  };
  writeState(state);
  return state;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
