import {
  DEPLOY_ALL_RUNBOOK,
  type DeployAllRunbookBranch,
} from "../console/deploy-all-runbook";
import {
  DEPLOY_ALL_PHASE_ORDER,
  phasesFrom,
  type DeployAllPhaseId,
} from "./phases";

/**
 * Branch-level resume, resolved against the runbook rather than invented.
 *
 * `--phase` and `--from-phase` are the coarsest possible retry: the smallest
 * unit either can name is a whole phase, and preflight is one phase containing
 * eighteen commands, two full builds and six service builds. So a failure in
 * the last of them costs the first seventeen again.
 *
 * These plans translate a branch id into the existing phase selection the
 * executor already understands — a phase to run and a set of branch ids to run
 * inside it — so branch-level resume adds precision without adding a second
 * way to drive the pipeline.
 */
export interface RunbookBranchLocation {
  readonly branchId: string;
  readonly phaseId: DeployAllPhaseId;
  readonly sectionId: string;
  readonly command: string;
  readonly kind: DeployAllRunbookBranch["kind"];
  /** Position in the full runbook, ascending. */
  readonly order: number;
}

let cachedLocations: readonly RunbookBranchLocation[] | undefined;

/** Every branch in the runbook, in execution order. */
export function runbookBranchLocations(): readonly RunbookBranchLocation[] {
  if (cachedLocations) return cachedLocations;
  const locations: RunbookBranchLocation[] = [];
  for (const phase of DEPLOY_ALL_RUNBOOK) {
    for (const section of phase.sections) {
      for (const branch of section.branches) {
        locations.push({
          branchId: branch.id,
          phaseId: phase.id,
          sectionId: section.id,
          command: branch.command,
          kind: branch.kind,
          order: locations.length,
        });
      }
    }
  }
  cachedLocations = locations;
  return locations;
}

export function findRunbookBranch(branchId: string): RunbookBranchLocation | undefined {
  return runbookBranchLocations().find((item) => item.branchId === branchId);
}

export function assertKnownBranchId(branchId: string): RunbookBranchLocation {
  const location = findRunbookBranch(branchId);
  if (!location) {
    throw new Error(
      `Unknown runbook branch id "${branchId}". Run "npm run deploy:all -- --list-phases" to see every branch id.`,
    );
  }
  return location;
}

export interface BranchResumePlan {
  /** Run this phase and every phase after it. */
  readonly fromPhase?: DeployAllPhaseId;
  /** Run only this phase. */
  readonly onlyPhase?: DeployAllPhaseId;
  readonly selectedBranches: ReadonlySet<string>;
  /** Human-readable statement of what the plan will run. */
  readonly description: string;
}

/** Resume at one branch and run everything the runbook lists after it. */
export function planFromBranch(branchId: string): BranchResumePlan {
  const location = assertKnownBranchId(branchId);
  const selected = runbookBranchLocations()
    .filter((item) => item.order >= location.order)
    .map((item) => item.branchId);
  return {
    fromPhase: location.phaseId,
    selectedBranches: new Set(selected),
    description:
      `resume at branch "${branchId}" (phase ${location.phaseId}) and run the ` +
      `${selected.length} branch(es) that follow it`,
  };
}

/** Run exactly one branch, inside its own phase, and nothing else. */
export function planRerunBranch(branchId: string): BranchResumePlan {
  const location = assertKnownBranchId(branchId);
  return {
    onlyPhase: location.phaseId,
    selectedBranches: new Set([branchId]),
    description: `re-run only branch "${branchId}" (phase ${location.phaseId})`,
  };
}

/**
 * Resume at the earliest branch a previous run recorded as failed.
 *
 * Earliest, not "all failed": a later failure is frequently the first one's
 * consequence, and restarting at the earliest failure re-proves the rest in
 * runbook order instead of guessing which of them were independent.
 */
export function planRerunFailed(failedBranchIds: readonly string[]): BranchResumePlan {
  if (failedBranchIds.length === 0) {
    throw new Error(
      "No failed branch is recorded in .deploy-all/branch-checkpoints.json. " +
        "There is nothing to re-run; start a phase with --from-phase=<id> instead.",
    );
  }
  const ordered = runbookBranchLocations().filter((item) => failedBranchIds.includes(item.branchId));
  if (ordered.length === 0) {
    throw new Error(
      `Recorded failed branch(es) ${failedBranchIds.join(", ")} are not in the current runbook. ` +
        "The runbook changed since that run; start from a phase instead.",
    );
  }
  const smallest = ordered[0]!;
  const plan = planFromBranch(smallest.branchId);
  return {
    ...plan,
    description:
      `re-run from the earliest failed branch "${smallest.branchId}" (phase ${smallest.phaseId}); ` +
      `recorded failures: ${ordered.map((item) => item.branchId).join(", ")}`,
  };
}

/** The smallest command that retries one branch. */
export function smallestRetryCommand(branchId: string): string {
  return `npm run deploy:all -- --rerun-branch=${branchId}`;
}

/** The smallest command that resumes the release from one branch onwards. */
export function resumeFromBranchCommand(branchId: string): string {
  return `npm run deploy:all -- --from-branch=${branchId}`;
}

/** Phases a branch-level plan will visit, in order. */
export function phasesForPlan(plan: BranchResumePlan): DeployAllPhaseId[] {
  if (plan.onlyPhase) return [plan.onlyPhase];
  if (plan.fromPhase) return phasesFrom(plan.fromPhase);
  return [...DEPLOY_ALL_PHASE_ORDER];
}
