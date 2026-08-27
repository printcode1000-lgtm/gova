import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { DEPLOY_ALL_RUNBOOK } from "../console/deploy-all-runbook";
import { deployAllStateDir, type DeployAllRunState } from "./state";

/**
 * Durable, branch-level memory of one deploy run.
 *
 * `run-state.json` records phases, which is the wrong granularity for a retry:
 * a preflight that fails on `smoke:services` — the last branch of the last
 * section — leaves the whole phase incomplete, so the operator's only offered
 * move re-runs lint, typecheck, the full test suite, two builds and six service
 * builds to reach the one command that failed. That cost is why runs get
 * retried with `--skip-preflight`, which is the outcome the gate exists to
 * prevent.
 *
 * A checkpoint records what a branch proved and what it proved it against: the
 * revision it ran at, and a content hash of the inputs it read. A later run may
 * reuse it only when both still match, so a checkpoint can never answer for
 * source that has changed since.
 *
 * What it may never do is stand in for an effect. Publishing, the git writes,
 * the secret backup, the six remote deployments and the production
 * verification are not verifications of the tree — they change the world, or
 * they observe a world that changed. Those live outside preflight, and this
 * store refuses to mark any of them skippable; only the deployment state's own
 * completed phases, at the same revision, can say they are done.
 */
export type DeployBranchStatus = "success" | "failed";

export interface DeployBranchCheckpoint {
  /** Runbook branch id, unique across the whole runbook. */
  readonly branchId: string;
  /** Phase the branch belongs to. */
  readonly phase: string;
  /** The command the branch ran. */
  readonly command: string;
  readonly status: DeployBranchStatus;
  readonly startedAt: string;
  readonly finishedAt: string;
  /** Commit SHA of HEAD when the branch ran. */
  readonly revision: string;
  /** Content hash of the inputs this branch was proven against. */
  readonly inputHash: string;
  /** Redacted one-line failure reason; absent on success. */
  readonly errorSummary?: string;
}

export interface DeployBranchCheckpointFile {
  readonly version: 1;
  readonly runId: string;
  readonly checkpoints: readonly DeployBranchCheckpoint[];
}

const CHECKPOINT_FILE_NAME = "branch-checkpoints.json";

export function branchCheckpointsPath(): string {
  return path.join(deployAllStateDir(), CHECKPOINT_FILE_NAME);
}

/**
 * The only phase whose branches may be replaced by a checkpoint.
 *
 * Derived from the runbook rather than listed, so a branch added to publish, to
 * a service deployment or to main verification is non-skippable the moment it
 * exists — the safe answer is the one nobody has to remember to write down.
 */
export const CHECKPOINT_SKIPPABLE_PHASES: ReadonlySet<string> = new Set(["preflight"]);

export function isCheckpointSkippablePhase(phaseId: string): boolean {
  return CHECKPOINT_SKIPPABLE_PHASES.has(phaseId);
}

/** Branch ids a checkpoint may never skip: publish, git, secrets, remote deploys, production verification. */
export function neverCheckpointSkippableBranchIds(): string[] {
  return DEPLOY_ALL_RUNBOOK.filter((phase) => !isCheckpointSkippablePhase(phase.id))
    .flatMap((phase) => phase.sections.flatMap((section) => section.branches.map((branch) => branch.id)))
    .sort();
}

function sortCheckpoints(
  checkpoints: readonly DeployBranchCheckpoint[],
): DeployBranchCheckpoint[] {
  return [...checkpoints].sort((left, right) =>
    left.branchId < right.branchId ? -1 : left.branchId > right.branchId ? 1 : 0,
  );
}

/** Stable key order, so two identical runs write byte-identical files. */
function serializeCheckpoint(checkpoint: DeployBranchCheckpoint): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    branchId: checkpoint.branchId,
    command: checkpoint.command,
    errorSummary: checkpoint.errorSummary,
    finishedAt: checkpoint.finishedAt,
    inputHash: checkpoint.inputHash,
    phase: checkpoint.phase,
    revision: checkpoint.revision,
    startedAt: checkpoint.startedAt,
    status: checkpoint.status,
  };
  if (checkpoint.errorSummary === undefined) delete serialized.errorSummary;
  return serialized;
}

export function readBranchCheckpointFile(): DeployBranchCheckpointFile | undefined {
  const file = branchCheckpointsPath();
  if (!existsSync(file)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as DeployBranchCheckpointFile;
    if (!Array.isArray(parsed.checkpoints)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function readBranchCheckpoints(): DeployBranchCheckpoint[] {
  return sortCheckpoints(readBranchCheckpointFile()?.checkpoints ?? []);
}

export function writeBranchCheckpointFile(file: DeployBranchCheckpointFile): void {
  mkdirSync(deployAllStateDir(), { recursive: true });
  const payload = {
    version: 1,
    runId: file.runId,
    checkpoints: sortCheckpoints(file.checkpoints).map(serializeCheckpoint),
  };
  writeFileSync(branchCheckpointsPath(), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/** Upsert one branch result. The newest result for a branch replaces the old one. */
export function recordBranchCheckpoint(
  checkpoint: DeployBranchCheckpoint,
  runId: string,
): DeployBranchCheckpoint[] {
  const existing = readBranchCheckpointFile();
  const kept = (existing?.checkpoints ?? []).filter((item) => item.branchId !== checkpoint.branchId);
  const checkpoints = sortCheckpoints([...kept, checkpoint]);
  writeBranchCheckpointFile({ version: 1, runId: runId || existing?.runId || "", checkpoints });
  return checkpoints;
}

export function clearBranchCheckpoints(): void {
  const file = branchCheckpointsPath();
  if (existsSync(file)) rmSync(file, { force: true });
}

export function findBranchCheckpoint(
  branchId: string,
  checkpoints: readonly DeployBranchCheckpoint[] = readBranchCheckpoints(),
): DeployBranchCheckpoint | undefined {
  return checkpoints.find((item) => item.branchId === branchId);
}

/** Branch ids whose last recorded result was a failure, in runbook order. */
export function failedBranchIds(
  checkpoints: readonly DeployBranchCheckpoint[] = readBranchCheckpoints(),
): string[] {
  const failed = new Set(
    checkpoints.filter((item) => item.status === "failed").map((item) => item.branchId),
  );
  return DEPLOY_ALL_RUNBOOK.flatMap((phase) =>
    phase.sections.flatMap((section) => section.branches.map((branch) => branch.id)),
  ).filter((branchId) => failed.has(branchId));
}

export interface CheckpointSkipDecision {
  readonly skip: boolean;
  /** Why the branch is or is not being skipped, for the run report. */
  readonly reason: string;
}

/**
 * Decide whether a previous success may stand in for running a branch again.
 *
 * Every answer here is "no" unless the branch is a preflight verification, the
 * previous run recorded it as successful, and both the commit SHA and the input
 * hash still match. Anything unknown — no checkpoint, an empty hash, a
 * different revision — is a run, not a skip.
 */
export function decideCheckpointSkip(input: {
  readonly branchId: string;
  readonly phaseId: string;
  readonly revision: string;
  readonly inputHash: string;
  readonly checkpoints?: readonly DeployBranchCheckpoint[];
}): CheckpointSkipDecision {
  if (!isCheckpointSkippablePhase(input.phaseId)) {
    return {
      skip: false,
      reason: `phase "${input.phaseId}" is never skipped by checkpoint; only recorded deployment state can prove it`,
    };
  }
  const checkpoint = findBranchCheckpoint(input.branchId, input.checkpoints ?? readBranchCheckpoints());
  if (!checkpoint) return { skip: false, reason: "no checkpoint recorded" };
  if (checkpoint.status !== "success") return { skip: false, reason: "last result was a failure" };
  if (!input.revision || !input.inputHash) {
    return { skip: false, reason: "current revision or input hash is unknown" };
  }
  if (checkpoint.revision !== input.revision) {
    return { skip: false, reason: "commit SHA changed since the checkpoint" };
  }
  if (checkpoint.inputHash !== input.inputHash) {
    return { skip: false, reason: "input hash changed since the checkpoint" };
  }
  return { skip: true, reason: `checkpoint at ${checkpoint.finishedAt} matches SHA and input hash` };
}

/**
 * Whether the durable deployment state — not a checkpoint — proves an
 * effectful phase already completed for exactly this revision.
 */
export function deploymentStateProvesPhase(
  state: DeployAllRunState | undefined,
  phaseId: string,
  revision: string,
): boolean {
  if (!state || !revision) return false;
  if (state.revision !== revision) return false;
  return state.completedPhases.includes(phaseId);
}
