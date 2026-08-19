import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
