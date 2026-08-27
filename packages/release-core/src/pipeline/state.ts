import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const STATE_DIR = path.join(process.cwd(), ".deploy-all");
const STATE_FILE = path.join(STATE_DIR, "run-state.json");

export interface DeployAllRunState {
  revision: string;
  runId: string;
  timestamp: string;
  mainComment: string;
  skipPreflight: boolean;
  completedPhases: string[];
  lastUpdated: string;
}

export function deployAllStatePath(): string {
  return STATE_FILE;
}

/** Directory every durable deploy artifact shares, including branch checkpoints. */
export function deployAllStateDir(): string {
  return STATE_DIR;
}

export function readDeployAllState(): DeployAllRunState | undefined {
  if (!existsSync(STATE_FILE)) return undefined;
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as DeployAllRunState;
  } catch {
    return undefined;
  }
}

export function writeDeployAllState(state: DeployAllRunState): void {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function markPhaseComplete(phaseId: string, patch: Partial<DeployAllRunState> = {}): DeployAllRunState {
  const current = readDeployAllState();
  const completedPhases = [...new Set([...(current?.completedPhases ?? []), phaseId])];
  const next: DeployAllRunState = {
    revision: patch.revision ?? current?.revision ?? "",
    runId: patch.runId ?? current?.runId ?? "",
    timestamp: patch.timestamp ?? current?.timestamp ?? "",
    mainComment: patch.mainComment ?? current?.mainComment ?? "",
    skipPreflight: patch.skipPreflight ?? current?.skipPreflight ?? false,
    completedPhases,
    lastUpdated: new Date().toISOString(),
  };
  writeDeployAllState(next);
  return next;
}

export function assertPhasePrerequisites(
  phaseId: string,
  required: readonly string[],
): DeployAllRunState | undefined {
  if (required.length === 0) return readDeployAllState();
  const state = readDeployAllState();
  const missing = required.filter((id) => !state?.completedPhases.includes(id));
  if (missing.length > 0) {
    throw new Error(
      `Phase "${phaseId}" requires completed phase(s): ${missing.join(", ")}.\n` +
        `Run them first, or use "npm run deploy:all -- --from-phase=${missing[0]}".\n` +
        `State file: ${STATE_FILE}`,
    );
  }
  if (!state) {
    throw new Error(`Phase "${phaseId}" requires a saved deploy run in ${STATE_FILE}.`);
  }
  return state;
}

const IN_FLIGHT_FILE = path.join(STATE_DIR, "in-flight.lock");

/**
 * Marks a deploy run as in progress, for tooling outside this process.
 *
 * Several preflight phases rewrite tracked files as a side effect of running:
 * every phase that boots a server re-runs schema sync and rewrites
 * `public/sync_data/*.json`, and `build:static` rewrites
 * `public/asol-web-manifest.json` with a new build id. A guard that reacts to a
 * dirty tree by committing and pushing therefore fires mid-run — and because
 * the main app redeploys on every push to `main`, each of those pushes cancels
 * the deployment this very run created. One run ended with the main target
 * TIMEOUT after 27 such pushes in three hours.
 *
 * `deploy:all` commits those files itself in its publish phase. This lock lets
 * an external guard stay quiet until then, without being told to trust the
 * agent's judgement.
 *
 * Deliberately not `run-state.json`: that file outlives a run by design, so it
 * says nothing about whether one is in progress. This file exists only while
 * the process does, and carries a timestamp so a crashed run cannot silence a
 * guard forever.
 */
export function markDeployInFlight(): void {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(
    IN_FLIGHT_FILE,
    `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

export function clearDeployInFlight(): void {
  if (existsSync(IN_FLIGHT_FILE)) rmSync(IN_FLIGHT_FILE, { force: true });
}

export function deployInFlightPath(): string {
  return IN_FLIGHT_FILE;
}
