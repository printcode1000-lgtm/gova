import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const STATE_DIR = path.join(process.cwd(), ".deploy-all");
const STATE_FILE = path.join(STATE_DIR, "run-state.json");

export interface DeployAllRunState {
  schemaVersion: 2;
  revision: string;
  sourceFingerprint: string;
  runId: string;
  timestamp: string;
  mainComment: string;
  skipPreflight: boolean;
  completedPhases: string[];
  lastUpdated: string;
}

export interface DeployAllStateIdentity {
  revision: string;
  sourceFingerprint: string;
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
    const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8")) as Partial<DeployAllRunState>;
    if (
      parsed.schemaVersion !== 2 ||
      typeof parsed.revision !== "string" ||
      parsed.revision.length === 0 ||
      typeof parsed.sourceFingerprint !== "string" ||
      parsed.sourceFingerprint.length === 0 ||
      !Array.isArray(parsed.completedPhases) ||
      !parsed.completedPhases.every((phase) => typeof phase === "string")
    ) {
      return undefined;
    }
    return parsed as DeployAllRunState;
  } catch {
    return undefined;
  }
}

function writeDeployAllState(state: DeployAllRunState): void {
  mkdirSync(STATE_DIR, { recursive: true });
  const temporary = `${STATE_FILE}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  renameSync(temporary, STATE_FILE);
}

export function newDeployAllState(identity: DeployAllStateIdentity): DeployAllRunState {
  return {
    schemaVersion: 2,
    revision: identity.revision,
    sourceFingerprint: identity.sourceFingerprint,
    runId: "",
    timestamp: "",
    mainComment: "",
    skipPreflight: false,
    completedPhases: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function createDeployAllState(identity: DeployAllStateIdentity): DeployAllRunState {
  const state = newDeployAllState(identity);
  writeDeployAllState(state);
  return state;
}

export function assertDeployAllStateIdentity(
  state: DeployAllRunState | undefined,
  identity: DeployAllStateIdentity,
  operation: string,
): asserts state is DeployAllRunState {
  if (!state) {
    throw new Error(`${operation} requires an active deploy run in ${STATE_FILE}.`);
  }
  if (state.revision !== identity.revision || state.sourceFingerprint !== identity.sourceFingerprint) {
    throw new Error(
      `${operation} cannot use deploy proof from another source identity. ` +
        `State revision ${state.revision || "unknown"}; current revision ${identity.revision || "unknown"}. ` +
        "Start a full deploy:all validation for the current source.",
    );
  }
}

export function markPhaseComplete(
  phaseId: string,
  identity: DeployAllStateIdentity,
  patch: Partial<Omit<DeployAllRunState, "schemaVersion" | "revision" | "sourceFingerprint" | "completedPhases">> = {},
): DeployAllRunState {
  const current = readDeployAllState();
  assertDeployAllStateIdentity(current, identity, `Completing phase "${phaseId}"`);
  const completedPhases = [...new Set([...current.completedPhases, phaseId])];
  const next: DeployAllRunState = {
    ...current,
    ...patch,
    schemaVersion: 2,
    revision: identity.revision,
    sourceFingerprint: identity.sourceFingerprint,
    completedPhases,
    lastUpdated: new Date().toISOString(),
  };
  writeDeployAllState(next);
  return next;
}

export function assertPhasePrerequisites(
  phaseId: string,
  required: readonly string[],
  identity: DeployAllStateIdentity,
): DeployAllRunState | undefined {
  const state = readDeployAllState();
  assertDeployAllStateIdentity(state, identity, `Phase "${phaseId}"`);
  if (required.length === 0) return state;
  const missing = required.filter((id) => !state?.completedPhases.includes(id));
  if (missing.length > 0) {
    throw new Error(
      `Phase "${phaseId}" requires completed phase(s): ${missing.join(", ")}.\n` +
        `Run them first, or use "npm run deploy:all -- --from-phase=${missing[0]}".\n` +
        `State file: ${STATE_FILE}`,
    );
  }
  return state;
}

/**
 * Move proof to the deployment commit only after the validated source fingerprint
 * is proven unchanged. This is the sole legal cross-revision transition.
 */
export function rebindDeployAllStateRevision(input: {
  fromRevision: string;
  toRevision: string;
  validatedSourceFingerprint: string;
  committedSourceFingerprint: string;
  patch?: Partial<Omit<DeployAllRunState, "schemaVersion" | "revision" | "sourceFingerprint" | "completedPhases">>;
}): DeployAllRunState {
  if (input.validatedSourceFingerprint !== input.committedSourceFingerprint) {
    throw new Error(
      "The deployment commit source fingerprint does not match the source validated by preflight.",
    );
  }
  const current = readDeployAllState();
  assertDeployAllStateIdentity(
    current,
    { revision: input.fromRevision, sourceFingerprint: input.validatedSourceFingerprint },
    "Rebinding deploy proof to the deployment commit",
  );
  const next: DeployAllRunState = {
    ...current,
    ...input.patch,
    schemaVersion: 2,
    revision: input.toRevision,
    sourceFingerprint: input.committedSourceFingerprint,
    completedPhases: [...current.completedPhases],
    lastUpdated: new Date().toISOString(),
  };
  writeDeployAllState(next);
  return next;
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
