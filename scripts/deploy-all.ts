import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEPLOY_ALL_PHASE_ORDER,
  type DeployAllPhaseId,
  type DeployAllServicePhaseId,
  formatPhaseList,
  isDeployAllPhaseId,
  phasesFrom,
  phasePrerequisites,
  SERVICE_PHASE_IDS,
} from "@asol/release-core";
import {
  assertPhasePrerequisites,
  clearDeployInFlight,
  markDeployInFlight,
  markPhaseComplete,
  readDeployAllState,
  writeDeployAllState,
} from "@asol/release-core";
import {
  type BranchResumePlan,
  type DeployBranchCheckpoint,
  assertKnownBranchId,
  assertPreflightGraphInvariants,
  buildPreflightGraph,
  decideCheckpointSkip,
  deploymentStateProvesPhase,
  failedBranchIds,
  findBranchCheckpoint,
  findRunbookBranch,
  hashDocumentationGateSources,
  isCheckpointSkippablePhase,
  hashServiceInputs,
  hashSharedGateSources,
  planFromBranch,
  planPreflightWaves,
  planRerunBranch,
  planRerunFailed,
  readBranchCheckpoints,
  recordBranchCheckpoint,
  resumeFromBranchCommand,
  smallestRetryCommand,
  summarizeBranchError,
} from "@asol/release-core";
import {
  DeploymentNpmScriptError,
  runDeploymentNpmScript,
} from "@asol/release-core";
import {
  type VercelDeploymentReport,
  waitForVercelProductionDeployment,
} from "@asol/vercel-deploy-core";
import {
  DEPLOY_ALL_PREFLIGHT_SECTIONS,
  DEPLOY_ALL_RUNBOOK,
  deployAllBranchIds,
  formatDeployAllRunbook,
  type DeployAllRunbookBranch,
} from "@asol/release-core/console";
import { pushMainBranch } from "@asol/release-core";
import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";
import {
  inspectNativeCompatibility,
  resolveNativeBaseline,
} from "@asol/ota-core/publishing";
import { ensureReleaseSecretsRestored } from "./ensure-release-secrets-restored";
import { loadReleaseEnvironment } from "./load-release-env";

loadReleaseEnvironment();

const ROOT = process.cwd();
const MAIN_BRANCH = "main";
const GIT_INDEX_LOCK = path.join(ROOT, ".git", "index.lock");
const ROOT_VERCEL_LINK = path.join(ROOT, ".vercel", "project.json");
const STALE_GIT_LOCK_AGE_MS = 2 * 60 * 1000;
const FAIL_PREFIX = "[deploy:all] FAILED —";
const SERVICES_PHASE_ALIAS = "services";

const SERVICE_DEPLOYS: Readonly<
  Record<DeployAllServicePhaseId, { target: DeployAllServicePhaseId; script: string }>
> = {
  notifications: { target: "notifications", script: "notifications:deploy" },
  products: { target: "products", script: "products:deploy" },
  orders: { target: "orders", script: "orders:deploy" },
  profiles: { target: "profiles", script: "profiles:deploy" },
  submain: { target: "submain", script: "submain:deploy" },
  sub2main: { target: "sub2main", script: "sub2main:deploy" },
};

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function assertMainBranch(): void {
  const branch = git(["branch", "--show-current"]);
  if (branch !== MAIN_BRANCH) {
    throw new Error(
      `deploy:all must run from ${MAIN_BRANCH}; current branch is ${branch || "detached HEAD"}.`,
    );
  }
}

function hasRunningGitProcess(): boolean {
  try {
    if (process.platform === "win32") {
      const output = execFileSync(
        "tasklist",
        ["/FI", "IMAGENAME eq git.exe", "/FO", "CSV", "/NH"],
        { encoding: "utf8", windowsHide: true },
      );
      return /"git\.exe"/i.test(output);
    }
    const output = execFileSync("pgrep", ["-x", "git"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

/** Remove only an abandoned Git lock; a fresh or actively owned lock stops deployment. */
function clearStaleGitIndexLock(): void {
  if (!existsSync(GIT_INDEX_LOCK)) return;
  const ageMs = Date.now() - statSync(GIT_INDEX_LOCK).mtimeMs;
  if (ageMs < STALE_GIT_LOCK_AGE_MS || hasRunningGitProcess()) {
    throw new Error(
      "Git index.lock is active. Close the other Git operation and run deploy:all again.",
    );
  }
  unlinkSync(GIT_INDEX_LOCK);
  console.log(
    `[deploy:all] Removed abandoned .git/index.lock (${Math.round(ageMs / 1000)} seconds old).`,
  );
}

function printFinalSummary(reports: VercelDeploymentReport[]): void {
  if (reports.length === 0) return;
  console.log("\n[deploy:all] Final verified production report");
  console.table(
    reports.map((report) => ({
      target: report.target,
      account: report.account,
      project: report.project,
      comment: report.comment,
      state: report.state,
      url: report.url ?? "-",
      message: report.errorCode
        ? `${report.errorCode}: ${report.message}`
        : report.message,
    })),
  );
}

interface DeployFlags {
  skipPreflight: boolean;
  allowEmpty: boolean;
  allowManifestDowngrade: boolean;
  allowScratchFiles: boolean;
  continueOnError: boolean;
  /** Force `smoke:services` to rebuild each service instead of reusing the `services:build` output. */
  serviceSmokeRebuild: boolean;
}

interface PhaseSelection {
  listPhases: boolean;
  onlyPhase?: DeployAllPhaseId | typeof SERVICES_PHASE_ALIAS;
  fromPhase?: DeployAllPhaseId;
  revisionOverride?: string;
  selectedBranches?: ReadonlySet<string>;
  /**
   * Whether this invocation is a resume of an earlier run.
   *
   * A full `npm run deploy:all` proves the release from nothing and never
   * consults a checkpoint. Reuse is only ever offered to a run that explicitly
   * asked to continue one.
   */
  resume?: boolean;
  /** What the operator asked for, echoed in the run header. */
  resumeDescription?: string;
}

interface ParsedArgv {
  flags: DeployFlags;
  phase: PhaseSelection;
}

const DEPLOY_FLAG_NAMES = new Set([
  "--skip-preflight",
  "--allow-empty",
  "--allow-manifest-downgrade",
  "--allow-scratch-files",
  "--continue-on-error",
  "--service-smoke-rebuild",
  "--rerun-failed",
]);

const VALUE_FLAG_PREFIXES = [
  "--phase=",
  "--from-phase=",
  "--from-branch=",
  "--rerun-branch=",
  "--revision=",
  "--runbook-branches=",
] as const;

function parseFlags(argv: readonly string[]): DeployFlags {
  const unknown = argv.filter(
    (arg) =>
      !DEPLOY_FLAG_NAMES.has(arg) &&
      !VALUE_FLAG_PREFIXES.some((prefix) => arg.startsWith(prefix)) &&
      arg !== "--list-phases",
  );
  if (unknown.length > 0) {
    throw new Error(
      `Unknown option(s): ${unknown.join(", ")}. Known deploy flags: ${[...DEPLOY_FLAG_NAMES].join(", ")}; ` +
        `selection flags: ${VALUE_FLAG_PREFIXES.map((prefix) => `${prefix}<value>`).join(", ")}, --list-phases.`,
    );
  }
  return {
    skipPreflight: argv.includes("--skip-preflight"),
    allowEmpty: argv.includes("--allow-empty"),
    allowManifestDowngrade: argv.includes("--allow-manifest-downgrade"),
    allowScratchFiles: argv.includes("--allow-scratch-files"),
    continueOnError: argv.includes("--continue-on-error"),
    serviceSmokeRebuild: argv.includes("--service-smoke-rebuild"),
  };
}

function parsePhaseArg(argv: readonly string[], prefix: "--phase=" | "--from-phase="): string | undefined {
  const entry = argv.find((arg) => arg.startsWith(prefix));
  return entry?.slice(prefix.length);
}

function parseRevisionArg(argv: readonly string[]): string | undefined {
  const entry = argv.find((arg) => arg.startsWith("--revision="));
  return entry?.slice("--revision=".length);
}

function parseSelectedBranches(argv: readonly string[]): ReadonlySet<string> | undefined {
  const entry = argv.find((arg) => arg.startsWith("--runbook-branches="));
  if (!entry) return undefined;
  const raw = entry.slice("--runbook-branches=".length).trim();
  if (!raw) return new Set();
  const allowed = new Set(deployAllBranchIds());
  const selected = raw.split(",").map((item) => item.trim()).filter(Boolean);
  const unknown = selected.filter((id) => !allowed.has(id));
  if (unknown.length > 0) {
    throw new Error(`Unknown runbook branch id(s): ${unknown.join(", ")}.`);
  }
  return new Set(selected);
}

function parseBranchArg(
  argv: readonly string[],
  prefix: "--from-branch=" | "--rerun-branch=",
): string | undefined {
  const entry = argv.find((arg) => arg.startsWith(prefix));
  const value = entry?.slice(prefix.length).trim();
  if (entry && !value) {
    throw new Error(`${prefix}<runbookBranchId> requires a branch id.`);
  }
  return value || undefined;
}

/**
 * One selector per run.
 *
 * `--phase`, `--from-phase`, `--from-branch`, `--rerun-branch` and
 * `--rerun-failed` all answer the same question — where does this run start —
 * and two answers cannot both be honoured. Refusing here is what keeps a
 * mistyped resume from quietly running more of the release than was asked for.
 */
function assertSingleSelector(selectors: readonly (string | undefined)[]): void {
  const given = selectors.filter((value): value is string => Boolean(value));
  if (given.length > 1) {
    throw new Error(
      "Use exactly one of --phase=<id>, --from-phase=<id>, --from-branch=<id>, --rerun-branch=<id>, --rerun-failed — not both. " +
        `Given: ${given.join(", ")}.`,
    );
  }
}

function selectionFromPlan(
  plan: BranchResumePlan,
  revisionOverride: string | undefined,
  explicitBranches: ReadonlySet<string> | undefined,
): PhaseSelection {
  return {
    listPhases: false,
    onlyPhase: plan.onlyPhase,
    fromPhase: plan.fromPhase,
    revisionOverride,
    // An explicit --runbook-branches list narrows the plan further; it never widens it.
    selectedBranches: explicitBranches
      ? new Set([...plan.selectedBranches].filter((id) => explicitBranches.has(id)))
      : plan.selectedBranches,
    resume: true,
    resumeDescription: plan.description,
  };
}

function parseArgv(argv: readonly string[]): ParsedArgv {
  const flags = parseFlags(argv);
  const revisionOverride = parseRevisionArg(argv);
  const selectedBranches = parseSelectedBranches(argv);
  if (argv.includes("--list-phases")) {
    return { flags, phase: { listPhases: true, resume: false } };
  }

  const onlyPhaseRaw = parsePhaseArg(argv, "--phase=");
  const fromPhaseRaw = parsePhaseArg(argv, "--from-phase=");
  const fromBranchRaw = parseBranchArg(argv, "--from-branch=");
  const rerunBranchRaw = parseBranchArg(argv, "--rerun-branch=");
  const rerunFailed = argv.includes("--rerun-failed");
  assertSingleSelector([
    onlyPhaseRaw && `--phase=${onlyPhaseRaw}`,
    fromPhaseRaw && `--from-phase=${fromPhaseRaw}`,
    fromBranchRaw && `--from-branch=${fromBranchRaw}`,
    rerunBranchRaw && `--rerun-branch=${rerunBranchRaw}`,
    rerunFailed ? "--rerun-failed" : undefined,
  ]);

  if (fromBranchRaw) {
    assertKnownBranchId(fromBranchRaw);
    return { flags, phase: selectionFromPlan(planFromBranch(fromBranchRaw), revisionOverride, selectedBranches) };
  }

  if (rerunBranchRaw) {
    assertKnownBranchId(rerunBranchRaw);
    return { flags, phase: selectionFromPlan(planRerunBranch(rerunBranchRaw), revisionOverride, selectedBranches) };
  }

  if (rerunFailed) {
    return {
      flags,
      phase: selectionFromPlan(planRerunFailed(failedBranchIds()), revisionOverride, selectedBranches),
    };
  }

  if (onlyPhaseRaw) {
    if (onlyPhaseRaw === SERVICES_PHASE_ALIAS) {
      return {
        flags,
        phase: {
          listPhases: false,
          onlyPhase: SERVICES_PHASE_ALIAS,
          revisionOverride,
          selectedBranches,
          resume: true,
          resumeDescription: `run only the "${SERVICES_PHASE_ALIAS}" phase alias`,
        },
      };
    }
    if (!isDeployAllPhaseId(onlyPhaseRaw)) {
      throw new Error(
        `Unknown phase "${onlyPhaseRaw}". Run with --list-phases to see valid phase ids.`,
      );
    }
    return {
      flags,
      phase: {
        listPhases: false,
        onlyPhase: onlyPhaseRaw,
        revisionOverride,
        selectedBranches,
        resume: true,
        resumeDescription: `run only phase "${onlyPhaseRaw}"`,
      },
    };
  }

  if (fromPhaseRaw) {
    if (!isDeployAllPhaseId(fromPhaseRaw)) {
      throw new Error(
        `Unknown phase "${fromPhaseRaw}". Run with --list-phases to see valid phase ids.`,
      );
    }
    return {
      flags,
      phase: {
        listPhases: false,
        fromPhase: fromPhaseRaw,
        revisionOverride,
        selectedBranches,
        resume: true,
        resumeDescription: `resume from phase "${fromPhaseRaw}"`,
      },
    };
  }

  return {
    flags,
    phase: {
      listPhases: false,
      revisionOverride,
      selectedBranches,
      resume: Boolean(selectedBranches),
      resumeDescription: selectedBranches ? "run the explicitly selected runbook branches" : undefined,
    },
  };
}

function resolvePhasesToRun(selection: PhaseSelection): DeployAllPhaseId[] {
  if (selection.onlyPhase === SERVICES_PHASE_ALIAS) {
    return [...SERVICE_PHASE_IDS];
  }
  if (selection.onlyPhase) {
    return [selection.onlyPhase];
  }
  if (selection.fromPhase) {
    return phasesFrom(selection.fromPhase);
  }
  return [...DEPLOY_ALL_PHASE_ORDER];
}

function requiredPrerequisites(
  phaseId: DeployAllPhaseId,
  flags: DeployFlags,
): DeployAllPhaseId[] {
  const required = phasePrerequisites(phaseId);
  if (flags.skipPreflight) {
    return required.filter((id) => id !== "preflight");
  }
  return required;
}

function selectedIncludes(selection: PhaseSelection, branchId: string): boolean {
  return !selection.selectedBranches || selection.selectedBranches.has(branchId);
}

function phaseHasSelectedBranches(selection: PhaseSelection, phaseId: DeployAllPhaseId): boolean {
  if (!selection.selectedBranches) return true;
  const phase = DEPLOY_ALL_RUNBOOK.find((item) => item.id === phaseId);
  return Boolean(
    phase?.sections.some((section) =>
      section.branches.some((item) => selection.selectedBranches?.has(item.id)),
    ),
  );
}

function skippedBranch(prefix: string, item: DeployAllRunbookBranch): void {
  console.log(`${prefix} SKIP ${item.id}: ${item.command}`);
}

function announceBranch(prefix: string, item: { id: string; command: string; label?: string }): void {
  console.log(`${prefix} branch ${item.id}: ${item.command}${item.label ? ` — ${item.label}` : ""}`);
}

/**
 * What every branch of this run did, and why.
 *
 * A resumed run's most important output is not the failure — it is the list of
 * what it did not do. A report that says "preflight passed" after reusing nine
 * checkpoints is a different claim from one that proved nine gates, and an
 * operator deciding whether to publish needs to be able to tell them apart
 * without reading the scrollback.
 */
type BranchRunStatus = "completed" | "skipped" | "failed";

interface BranchOutcome {
  branchId: string;
  phase: string;
  command: string;
  status: BranchRunStatus;
  /** True only when a valid checkpoint — matching SHA and input hash — replaced the run. */
  fromCheckpoint: boolean;
  detail: string;
  durationMs: number;
}

interface RunContext {
  runId: string;
  /**
   * Identifier every child gate sees for this invocation.
   *
   * `build` and `build:static` share a long list of source checks. Within one
   * deploy run they read the same source, so the second gate may reuse the
   * first gate's result — but only inside the same invocation, which this id
   * scopes. A separate `npm run build` has no such id and re-proves everything.
   */
  gateRunId: string;
  /** HEAD when the run started; what preflight checkpoints are recorded against. */
  headRevision: string;
  checkpoints: DeployBranchCheckpoint[];
  resume: boolean;
  ledger: BranchOutcome[];
  /** Earliest branch this run failed on, which is the one worth retrying first. */
  firstFailedBranchId?: string;
  /** Set once the deployment commit is on GitHub, so failures after it can offer a rollback. */
  pushedRevision?: string;
  sourceHash?: string;
  documentationSourceHash?: string;
}

function createRunContext(selection: PhaseSelection): RunContext {
  let headRevision = "";
  try {
    headRevision = git(["rev-parse", "HEAD"]);
  } catch {
    // A repository without a commit cannot be resumed against a SHA; every
    // checkpoint comparison then refuses to skip, which is the safe answer.
  }
  const state = readDeployAllState();
  const resolvedHead = selection.revisionOverride?.trim() || headRevision;
  return {
    runId: state?.runId ?? "",
    gateRunId: `${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 17)}-${resolvedHead.slice(0, 12)}`,
    headRevision: resolvedHead,
    checkpoints: readBranchCheckpoints(),
    resume: selection.resume === true,
    ledger: [],
  };
}

/**
 * Content hash of the source every shared gate reads, computed once per run.
 *
 * Once, not per branch: preflight rewrites generated files while it runs, and a
 * hash recomputed between branches would report a different input for two
 * branches that read the same source. The question a checkpoint answers is
 * "has the source changed since the run that proved this", and the run's own
 * starting state is the only stable way to ask it.
 */
function sourceHashFor(context: RunContext): string {
  if (context.sourceHash === undefined) {
    context.sourceHash = hashSharedGateSources(ROOT);
  }
  return context.sourceHash;
}

function documentationSourceHashFor(context: RunContext): string {
  if (context.documentationSourceHash === undefined) {
    context.documentationSourceHash = hashDocumentationGateSources(ROOT);
  }
  return context.documentationSourceHash;
}

function preflightInputHashFor(context: RunContext, branchId: string): string {
  return branchId === "knowledge" || branchId === "architecture"
    ? documentationSourceHashFor(context)
    : sourceHashFor(context);
}

function recordOutcome(context: RunContext, outcome: BranchOutcome): void {
  context.ledger.push(outcome);
  if (outcome.status === "failed" && !context.firstFailedBranchId) {
    context.firstFailedBranchId = outcome.branchId;
  }
}

/**
 * Run one runbook branch, with the checkpoint rules applied.
 *
 * The reuse decision lives in `@asol/release-core` and is deliberately
 * conservative: a preflight verification may be replaced by a recorded success
 * at the same SHA and input hash, and nothing else may. An effectful branch —
 * the secret backup, a git write, a remote deployment, production verification
 * — is only ever skipped when the deployment state itself records its phase as
 * complete for this exact revision, which is a record of the effect rather than
 * a record of a check.
 */
async function executeBranch(
  context: RunContext,
  branch: { branchId: string; phase: string; command: string; label?: string },
  options: {
    selected: boolean;
    revision: string;
    inputHash: string;
    groupOutput?: boolean;
    run: () => Promise<void> | void;
  },
): Promise<void> {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  if (!options.selected) {
    skippedBranch("[deploy:all]", {
      id: branch.branchId,
      label: branch.label ?? branch.branchId,
      command: branch.command,
      kind: "npm",
    });
    recordOutcome(context, {
      branchId: branch.branchId,
      phase: branch.phase,
      command: branch.command,
      status: "skipped",
      fromCheckpoint: false,
      detail: "not selected by this run",
      durationMs: 0,
    });
    return;
  }

  if (context.resume) {
    const decision = decideCheckpointSkip({
      branchId: branch.branchId,
      phaseId: branch.phase,
      revision: options.revision,
      inputHash: options.inputHash,
      checkpoints: context.checkpoints,
    });
    let skip = decision.skip;
    let reason = decision.reason;
    if (!skip && !isCheckpointSkippablePhase(branch.phase)) {
      const recorded = findBranchCheckpoint(branch.branchId, context.checkpoints);
      const proven = deploymentStateProvesPhase(readDeployAllState(), branch.phase, options.revision);
      if (
        proven &&
        recorded?.status === "success" &&
        recorded.revision === options.revision &&
        recorded.inputHash === options.inputHash
      ) {
        skip = true;
        reason = `deployment state records phase "${branch.phase}" complete for revision ${options.revision.slice(0, 12)}`;
      }
    }
    if (skip) {
      console.log(`[deploy:all] SKIP ${branch.branchId}: ${branch.command} — ${reason}`);
      recordOutcome(context, {
        branchId: branch.branchId,
        phase: branch.phase,
        command: branch.command,
        status: "skipped",
        fromCheckpoint: true,
        detail: reason,
        durationMs: 0,
      });
      return;
    }
  }

  announceBranch("[deploy:all]", { id: branch.branchId, command: branch.command, label: branch.label });
  try {
    await options.run();
    const finishedAt = new Date().toISOString();
    context.checkpoints = recordBranchCheckpoint(
      {
        branchId: branch.branchId,
        phase: branch.phase,
        command: branch.command,
        status: "success",
        startedAt,
        finishedAt,
        revision: options.revision,
        inputHash: options.inputHash,
      },
      context.runId,
    );
    recordOutcome(context, {
      branchId: branch.branchId,
      phase: branch.phase,
      command: branch.command,
      status: "completed",
      fromCheckpoint: false,
      detail: "verified in this run",
      durationMs: Date.now() - startedMs,
    });
  } catch (error) {
    const errorSummary = summarizeBranchError(error);
    context.checkpoints = recordBranchCheckpoint(
      {
        branchId: branch.branchId,
        phase: branch.phase,
        command: branch.command,
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        revision: options.revision,
        inputHash: options.inputHash,
        errorSummary,
      },
      context.runId,
    );
    recordOutcome(context, {
      branchId: branch.branchId,
      phase: branch.phase,
      command: branch.command,
      status: "failed",
      fromCheckpoint: false,
      detail: errorSummary,
      durationMs: Date.now() - startedMs,
    });
    throw error;
  }
}

/**
 * The smallest command that retries what failed.
 *
 * Phase-level retry is the fallback, not the offer. When the run knows which
 * branch failed it says so first, because re-running one command is what makes
 * an operator willing to fix and retry instead of reaching for
 * `--skip-preflight`.
 */
function printRetryHint(context: RunContext, failedPhase: DeployAllPhaseId): void {
  const branchId = context.firstFailedBranchId;
  if (branchId) {
    console.error(
      `\n[deploy:all] Fix the failure, then retry the smallest possible unit:\n` +
        `  ${smallestRetryCommand(branchId)}\n` +
        `Or resume the release from that branch onwards:\n` +
        `  ${resumeFromBranchCommand(branchId)}\n` +
        `Or re-run every recorded failure from the earliest one:\n` +
        `  npm run deploy:all -- --rerun-failed\n` +
        `Phase-level retry remains available:\n` +
        `  npm run deploy:all -- --phase=${failedPhase}\n` +
        `  npm run deploy:all -- --from-phase=${failedPhase}`,
    );
    return;
  }
  console.error(
    `\n[deploy:all] Fix the failure, then retry only this phase:\n` +
      `  npm run deploy:all -- --phase=${failedPhase}\n` +
      `Or continue from here:\n` +
      `  npm run deploy:all -- --from-phase=${failedPhase}`,
  );
}

/** Completed / skipped / failed, and whether each skip came from a valid checkpoint. */
function printBranchLedger(context: RunContext): void {
  if (context.ledger.length === 0) return;
  console.log("\n[deploy:all] Branch report");
  console.table(
    context.ledger.map((entry) => ({
      branch: entry.branchId,
      phase: entry.phase,
      command: entry.command,
      status: entry.status,
      skippedByCheckpoint: entry.status === "skipped" ? (entry.fromCheckpoint ? "yes" : "no") : "-",
      seconds: entry.durationMs > 0 ? Math.round(entry.durationMs / 1000) : 0,
      detail: entry.detail,
    })),
  );
  const completed = context.ledger.filter((entry) => entry.status === "completed").length;
  const checkpointSkips = context.ledger.filter((entry) => entry.status === "skipped" && entry.fromCheckpoint).length;
  const selectionSkips = context.ledger.filter((entry) => entry.status === "skipped" && !entry.fromCheckpoint).length;
  const failed = context.ledger.filter((entry) => entry.status === "failed").length;
  console.log(
    `[deploy:all] ${completed} branch(es) verified in this run, ` +
      `${checkpointSkips} reused from a valid checkpoint, ` +
      `${selectionSkips} not selected, ${failed} failed.`,
  );
}

/**
 * Whether every branch of a phase was actually covered by this run.
 *
 * A phase is only "complete" when nothing in it was left out by the current
 * selection. A checkpoint skip counts as covered — it is a recorded success at
 * this exact revision and input hash — but a branch the operator did not select
 * is not covered by anything, and marking the phase complete anyway would let a
 * later `--from-phase=publish` believe a preflight ran that never did.
 *
 * This is what stops `--rerun-branch=lint` from certifying the whole preflight.
 */
function phaseFullyCovered(context: RunContext, phaseId: string): boolean {
  const entries = context.ledger.filter((entry) => entry.phase === phaseId);
  if (entries.length === 0) return false;
  return entries.every(
    (entry) => entry.status === "completed" || (entry.status === "skipped" && entry.fromCheckpoint),
  );
}

const PREFLIGHT_STEPS = DEPLOY_ALL_PREFLIGHT_SECTIONS.flatMap((section) =>
  section.branches.map((step) => step.command),
);

/** Independent quality checks that may share the machine, bounded so they do not starve each other. */
const PREFLIGHT_PARALLEL_LIMIT = 4;

async function runInBatches<T>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<void>,
): Promise<PromiseSettledResult<void>[]> {
  const results: PromiseSettledResult<void>[] = [];
  for (let index = 0; index < items.length; index += limit) {
    const batch = items.slice(index, index + limit);
    results.push(...(await Promise.allSettled(batch.map((item) => run(item)))));
  }
  return results;
}

async function runPreflightPhase(
  flags: DeployFlags,
  selection: PhaseSelection,
  context: RunContext,
): Promise<void> {
  if (flags.skipPreflight) {
    console.warn(
      "\n[deploy:all] ⚠ PREFLIGHT SKIPPED. Not verified before publishing:\n" +
        PREFLIGHT_STEPS.map((step) => `  - npm run ${step}`).join("\n") +
        "\n[deploy:all] ⚠ The deployment commit will record that these were skipped.\n",
    );
    return;
  }

  const nodes = buildPreflightGraph();
  // A missing edge is a correctness failure, not a slow run: it would let a
  // mirror be verified before it is synced, or a build be measured before it
  // exists. Checked here so the run stops before it starts.
  assertPreflightGraphInvariants(nodes);

  const selectedIds = new Set(
    nodes.filter((node) => selectedIncludes(selection, node.id)).map((node) => node.id),
  );
  for (const node of nodes) {
    if (selectedIds.has(node.id)) continue;
    await executeBranch(
      context,
      { branchId: node.id, phase: "preflight", command: node.command },
      { selected: false, revision: context.headRevision, inputHash: preflightInputHashFor(context, node.id), run: () => {} },
    );
  }

  const waves = planPreflightWaves(nodes, selectedIds);
  console.log("[deploy:all] Preflight execution plan:");
  waves.forEach((wave, index) => {
    console.log(
      `  ${index + 1}. ${wave.mode}: ${wave.nodes.map((node) => `${node.id} (${node.command})`).join(", ")}`,
    );
  });

  for (const wave of waves) {
    if (wave.mode === "exclusive") {
      const node = wave.nodes[0]!;
      console.log(`\n[deploy:all] Preflight step (${node.sectionId}): ${node.id}`);
      // Exclusive branches fail fast. Everything after a broken build would be
      // measuring a build that does not exist.
      await executeBranch(
        context,
        { branchId: node.id, phase: "preflight", command: node.command },
        {
          selected: true,
          revision: context.headRevision,
          inputHash: preflightInputHashFor(context, node.id),
          run: () => runDeploymentNpmScript(node.command, { logPrefix: "deploy:all" }).then(() => undefined),
        },
      );
      continue;
    }

    console.log(
      `\n[deploy:all] Preflight wave (parallel): ${wave.nodes.map((node) => node.id).join(", ")}`,
    );
    const outcomes = await runInBatches(wave.nodes, PREFLIGHT_PARALLEL_LIMIT, (node) =>
      executeBranch(
        context,
        { branchId: node.id, phase: "preflight", command: node.command },
        {
          selected: true,
          revision: context.headRevision,
          inputHash: preflightInputHashFor(context, node.id),
          run: () =>
            runDeploymentNpmScript(node.command, { logPrefix: "deploy:all", groupOutput: true }).then(
              () => undefined,
            ),
        },
      ),
    );

    // Independent checks are reported together: three failures found in one
    // wave are one fix cycle, and three sequential runs are three.
    const failures = outcomes
      .map((outcome, index) => ({ outcome, node: wave.nodes[index]! }))
      .filter((entry) => entry.outcome.status === "rejected");
    if (failures.length > 0) {
      const detail = failures
        .map((entry) => {
          const reason = (entry.outcome as PromiseRejectedResult).reason;
          return `  - ${entry.node.id} (${entry.node.command}): ${reason instanceof Error ? reason.message : String(reason)}`;
        })
        .join("\n");
      throw new Error(
        `Preflight failed at ${failures.length} independent branch(es):\n${detail}\n` +
          "Nothing has been committed or pushed.",
      );
    }
  }
  if (phaseFullyCovered(context, "preflight")) {
    console.log("[deploy:all] Preflight passed; safe to publish.");
    return;
  }
  console.log(
    "[deploy:all] Selected preflight branches passed. Branches outside the selection were not run, " +
      "so this run does not certify preflight for publishing.",
  );
}

/**
 * Credentials are checked up front.
 *
 * `verifyMainDeployment` needs both of these, but it runs last — after the push
 * and after six service deployments. A missing token discovered there leaves a
 * published commit that was never verified.
 */
function assertDeploymentCredentials(): void {
  const missingTokens = Object.values(ACCOUNT_DECLARATIONS)
    .map((declaration) => declaration.tokenEnvVar)
    .filter((key) => !process.env[key]?.trim());
  if (missingTokens.length > 0) {
    throw new Error(
      `Vercel token(s) required before running deploy:all: ${missingTokens.join(", ")}.\n` +
        "On a clean Cloud Agent VM: add ASOL_SECRET_ARCHIVE_PASSWORD to Cloud Agents → Secrets, " +
        "then re-run (deploy:all auto-restores) or run `npm run secrets:restore` first.",
    );
  }
  const missingRuntime = Object.values(ACCOUNT_DECLARATIONS).flatMap((declaration) =>
    declaration.requiredEnv
      .filter((key) => !process.env[key]?.trim())
      .map((key) => `${declaration.name}: ${key}`),
  );
  if (missingRuntime.length > 0) {
    throw new Error(
      "Required Vercel runtime environment values are missing:\n" +
        missingRuntime.map((entry) => `  - ${entry}`).join("\n"),
    );
  }
  if (!existsSync(ROOT_VERCEL_LINK)) {
    throw new Error(
      ".vercel/project.json is required to identify the GitHub-linked main project.",
    );
  }
}

const SCRATCH_FILE_PATTERNS = [
  /(^|\/)__probe/i,
  /\.(log|tmp|bak|orig|rej)$/i,
  /(^|\/)scratchpad\//i,
  /(^|\/)\.DS_Store$/,
];

/**
 * `git add -A` stages whatever is in the tree, so the tree is reviewed first.
 * A stray probe or log file would otherwise be published to `main`.
 */
function assertNoScratchFiles(flags: DeployFlags): void {
  const status = git(["status", "--porcelain"]);
  const paths = status
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim());

  console.log(`[deploy:all] ${paths.length} path(s) will be included in the deployment commit.`);

  const scratch = paths.filter((entry) =>
    SCRATCH_FILE_PATTERNS.some((pattern) => pattern.test(entry)),
  );
  if (scratch.length > 0 && !flags.allowScratchFiles) {
    throw new Error(
      "Refusing to publish scratch files:\n" +
        scratch.map((entry) => `  - ${entry}`).join("\n") +
        "\nRemove them, or pass --allow-scratch-files if they are intentional.",
    );
  }
}

const RELEASE_MANIFEST = "public/asol-web-manifest.json";

/**
 * `build:static` rewrites the release manifest from `package.json` unless the
 * release environment variables are set, which downgrades `releaseId`,
 * `version`, and `minimumNativeVersion`. Publishing that would tell installed
 * shells an older release is current.
 */
function assertReleaseManifestNotDowngraded(flags: DeployFlags): void {
  const manifestPath = path.join(ROOT, RELEASE_MANIFEST);
  if (!existsSync(manifestPath)) return;

  let committed: Record<string, unknown>;
  let current: Record<string, unknown>;
  try {
    committed = JSON.parse(git(["show", `HEAD:${RELEASE_MANIFEST}`]));
    current = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    // No committed manifest to compare against, or unreadable JSON: the build
    // itself will fail on a malformed manifest, so nothing is asserted here.
    return;
  }

  const downgraded = (["releaseId", "version", "minimumNativeVersion"] as const).filter(
    (key) => {
      const before = committed[key];
      const after = current[key];
      return (
        typeof before === "string" &&
        typeof after === "string" &&
        before !== after &&
        compareVersions(after, before) < 0
      );
    },
  );

  if (downgraded.length > 0 && !flags.allowManifestDowngrade) {
    throw new Error(
      `${RELEASE_MANIFEST} would be downgraded (${downgraded.join(", ")}).\n` +
        "This is what a verification-only `build:static` does when the release env vars are unset.\n" +
        `Restore it with: git checkout -- ${RELEASE_MANIFEST}\n` +
        "Or pass --allow-manifest-downgrade if the downgrade is intended.",
    );
  }
}

/** Numeric-segment comparison; non-numeric suffixes fall back to string order. */
function compareVersions(left: string, right: string): number {
  const leftParts = left.split(/[.\-+]/);
  const rightParts = right.split(/[.\-+]/);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const a = leftParts[index] ?? "";
    const b = rightParts[index] ?? "";
    const numericA = Number(a);
    const numericB = Number(b);
    if (Number.isFinite(numericA) && Number.isFinite(numericB) && a !== "" && b !== "") {
      if (numericA !== numericB) return numericA < numericB ? -1 : 1;
      continue;
    }
    if (a !== b) return a < b ? -1 : 1;
  }
  return 0;
}

/**
 * An empty run would still create a commit and trigger a production build.
 * That is occasionally wanted, but it must be asked for.
 */
function assertSomethingToDeploy(flags: DeployFlags): void {
  if (flags.allowEmpty) return;
  if (git(["status", "--porcelain"])) return;

  let remoteHead = "";
  try {
    remoteHead = git(["rev-parse", `origin/${MAIN_BRANCH}`]);
  } catch {
    return; // No remote ref locally; let the push decide.
  }
  if (remoteHead === git(["rev-parse", "HEAD"])) {
    throw new Error(
      `Nothing to deploy: the working tree is clean and HEAD already matches origin/${MAIN_BRANCH}.\n` +
        "Pass --allow-empty to redeploy the current commit anyway.",
    );
  }
}

/**
 * A full Sandbox preflight can take long enough for another release to advance
 * main. Refuse before staging a commit: that newer tree did not pass this run's
 * preflight, and rebasing it here would silently publish unchecked code.
 */
function assertOriginMainDidNotAdvance(): void {
  git(["fetch", "origin", MAIN_BRANCH]);
  const localHead = git(["rev-parse", "HEAD"]);
  const remoteHead = git(["rev-parse", `origin/${MAIN_BRANCH}`]);
  if (localHead === remoteHead) return;

  try {
    git(["merge-base", "--is-ancestor", localHead, `origin/${MAIN_BRANCH}`]);
  } catch {
    return;
  }

  throw new Error(
    `origin/${MAIN_BRANCH} advanced during preflight; no deployment commit was created. ` +
      "Restart deploy:all so the current main tree receives the full preflight.",
  );
}

/** What to run if the push landed but a deployment did not. */
function printRollbackGuidance(revision: string): void {
  console.error(
    "\n[deploy:all] The commit is already on GitHub. To roll back:\n" +
      `  git revert ${revision}\n` +
      `  git push origin ${MAIN_BRANCH}\n` +
      "Or promote the previous production deployment from the Vercel dashboard.",
  );
}

function formatSuccessLine(skipPreflight: boolean): string {
  const preflight = skipPreflight ? "preflight skipped" : "preflight passed";
  return `[deploy:all] SUCCESS — ${preflight}, secrets backup completed, GitHub push completed, and all 7 Vercel production targets are READY.`;
}

function fail(message: string, revision?: string): void {
  if (revision) printRollbackGuidance(revision);
  console.error(`${FAIL_PREFIX} ${message}`);
  process.exitCode = 1;
}

async function verifyMainDeployment(input: {
  revision: string;
  comment: string;
}): Promise<VercelDeploymentReport> {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) throw new Error("VERCEL_TOKEN is required to verify the GitHub-linked main deployment.");
  if (!existsSync(ROOT_VERCEL_LINK)) {
    throw new Error(".vercel/project.json is required to identify the GitHub-linked main project.");
  }
  const link = JSON.parse(readFileSync(ROOT_VERCEL_LINK, "utf8")) as {
    projectId?: string;
    orgId?: string;
    projectName?: string;
  };
  if (!link.projectId) throw new Error("The main Vercel project link has no projectId.");
  return waitForVercelProductionDeployment({
    token,
    project: link.projectId,
    target: "main",
    account: link.orgId ?? "personal",
    comment: input.comment,
    teamId: link.orgId,
    revision: input.revision,
  });
}

interface PublishContext {
  revision: string;
  runId: string;
  timestamp: string;
  mainComment: string;
}

function resolvePublishContext(
  selection: PhaseSelection,
  existing?: ReturnType<typeof readDeployAllState>,
): PublishContext {
  const revision =
    selection.revisionOverride?.trim() ||
    existing?.revision?.trim() ||
    git(["rev-parse", "HEAD"]);
  const timestamp = existing?.timestamp || new Date().toISOString();
  const mainComment = existing?.mainComment || `deploy(main): ${timestamp}`;
  const runId =
    existing?.runId ||
    `${timestamp.replace(/[^0-9]/g, "").slice(0, 17)}-${revision.slice(0, 12)}`;
  return { revision, runId, timestamp, mainComment };
}

function publishBranch(branchId: string): { command: string; label: string } {
  const branch = DEPLOY_ALL_RUNBOOK
    .find((phaseItem) => phaseItem.id === "publish")
    ?.sections.flatMap((section) => section.branches)
    .find((item) => item.id === branchId);
  return { command: branch?.command ?? "assertion", label: branch?.label ?? branchId };
}

/**
 * Run one publish branch under the checkpoint rules.
 *
 * Kept as the single named door for publish-phase ownership: the runbook
 * execution contract reads this file and treats a branch as executed only when
 * a string-literal id reaches `selectedIncludes` or this function, so a branch
 * that appears on `/dev/deploy-all` cannot quietly stop running.
 */
async function runSelectedPublishBranch(
  selection: PhaseSelection,
  branchId: string,
  action: () => Promise<void> | void,
  context: RunContext,
): Promise<void> {
  const branch = publishBranch(branchId);
  await executeBranch(
    context,
    { branchId, phase: "publish", command: branch.command, label: branch.label },
    {
      selected: selectedIncludes(selection, branchId),
      revision: context.headRevision,
      inputHash: sourceHashFor(context),
      run: action,
    },
  );
}

async function runPublishPhase(
  flags: DeployFlags,
  selection: PhaseSelection,
  context: RunContext,
): Promise<PublishContext> {
  await runSelectedPublishBranch(selection, "main-branch", assertMainBranch, context);
  await runSelectedPublishBranch(selection, "deployment-credentials", assertDeploymentCredentials, context);
  await runSelectedPublishBranch(selection, "scratch-files", () => assertNoScratchFiles(flags), context);
  await runSelectedPublishBranch(selection, "release-manifest", () => assertReleaseManifestNotDowngraded(flags), context);
  await runSelectedPublishBranch(selection, "non-empty-release", () => assertSomethingToDeploy(flags), context);
  await runSelectedPublishBranch(selection, "origin-main-current", assertOriginMainDidNotAdvance, context);

  await runSelectedPublishBranch(
    selection,
    "secrets-backup",
    async () => {
      console.log("[deploy:all] Creating or verifying the encrypted secrets backup...");
      await runDeploymentNpmScript("secrets:backup", { logPrefix: "deploy:all" });
    },
    context,
  );

  await runSelectedPublishBranch(selection, "clear-git-lock", clearStaleGitIndexLock, context);

  const timestamp = new Date().toISOString();
  const mainComment = `deploy(main): ${timestamp}`;
  await runSelectedPublishBranch(
    selection,
    "stage-tree",
    () => {
      console.log(`[deploy:all] Staging deployment tree for: ${mainComment}`);
      execFileSync("git", ["add", "-A"], { cwd: ROOT, stdio: "inherit" });
    },
    context,
  );

  await runSelectedPublishBranch(
    selection,
    "commit-tree",
    () => {
      console.log(`[deploy:all] Creating deployment commit: ${mainComment}`);
      const commitArgs = ["commit", "--allow-empty", "-m", mainComment];
      if (flags.skipPreflight) {
        commitArgs.push(
          "-m",
          `Preflight skipped via --skip-preflight. Not verified: ${PREFLIGHT_STEPS.join(", ")}.`,
        );
      }
      execFileSync("git", commitArgs, { cwd: ROOT, stdio: "inherit" });
    },
    context,
  );

  await runSelectedPublishBranch(
    selection,
    "verify-clean-tree",
    () => {
      if (git(["status", "--porcelain"])) {
        throw new Error(
          "The working tree changed while creating the deployment commit; refusing to push inconsistent source.",
        );
      }
    },
    context,
  );

  const revision = git(["rev-parse", "HEAD"]);
  const runId = `${timestamp.replace(/[^0-9]/g, "").slice(0, 17)}-${revision.slice(0, 12)}`;
  context.runId = runId;
  await runSelectedPublishBranch(
    selection,
    "push-main",
    () => {
      console.log("[deploy:all] Pushing main to GitHub...");
      pushMainBranch(ROOT, MAIN_BRANCH, "deploy:all");
      // Recorded the moment the push lands: every failure after this point must
      // name the revision that is now public, and how to take it back.
      context.pushedRevision = revision;
      console.log(
        "[deploy:all] GitHub push completed; only the existing GitHub-linked main Vercel project will auto-deploy.",
      );
    },
    context,
  );

  writeDeployAllState({
    revision,
    runId,
    timestamp,
    mainComment,
    skipPreflight: flags.skipPreflight,
    completedPhases: readDeployAllState()?.completedPhases ?? [],
    lastUpdated: new Date().toISOString(),
  });

  return { revision, runId, timestamp, mainComment };
}

async function runServicePhase(
  phaseId: DeployAllServicePhaseId,
  publishContext: PublishContext,
  context: RunContext,
): Promise<VercelDeploymentReport> {
  const deployment = SERVICE_DEPLOYS[phaseId];
  const comment = `deploy(${deployment.target}): ${publishContext.timestamp} @ ${publishContext.revision.slice(0, 12)}`;
  let report: VercelDeploymentReport | undefined;
  await executeBranch(
    context,
    {
      branchId: `${phaseId}-deploy-command`,
      phase: phaseId,
      command: deployment.script,
      label: `${phaseId} deploy script`,
    },
    {
      selected: true,
      revision: publishContext.revision,
      // What this branch uploads is the mirrored service folder, so that folder
      // — not the whole repository — is what a later run must match to reuse it.
      inputHash: hashServiceInputs(ROOT, phaseId),
      run: async () => {
        report = await runDeploymentNpmScript(deployment.script, {
          logPrefix: "deploy:all",
          captureReport: true,
          env: {
            ASOL_DEPLOYMENT_RUN_ID: `${publishContext.runId}-${deployment.target}`,
            ASOL_DEPLOYMENT_REVISION: publishContext.revision,
            ASOL_DEPLOYMENT_COMMENT: comment,
          },
        });
        if (!report) throw new Error("The service returned no deployment report.");
        if (report.state !== "READY") {
          throw new Error(report.message || `Service ${deployment.target} is ${report.state}.`);
        }
      },
    },
  );
  if (!report) throw new Error(`Service ${deployment.target} produced no deployment report.`);
  return report;
}

async function runMainPhase(
  selection: PhaseSelection,
  publishContext: PublishContext,
  context: RunContext,
): Promise<VercelDeploymentReport | undefined> {
  let mainReport: VercelDeploymentReport | undefined;
  await executeBranch(
    context,
    {
      branchId: "main-ready",
      phase: "main",
      command: "vercel:wait-main-ready",
      label: "match commit SHA and wait for READY",
    },
    {
      selected: selectedIncludes(selection, "main-ready"),
      revision: publishContext.revision,
      inputHash: sourceHashFor(context),
      run: async () => {
        mainReport = await verifyMainDeployment({
          revision: publishContext.revision,
          comment: publishContext.mainComment,
        });
      },
    },
  );
  const report = mainReport;

  let serving = false;
  await executeBranch(
    context,
    {
      branchId: "main-serving",
      phase: "main",
      command: "release:check",
      label: "production is serving this build",
    },
    {
      selected: selectedIncludes(selection, "main-serving"),
      revision: publishContext.revision,
      inputHash: sourceHashFor(context),
      run: async () => {
        try {
          await runDeploymentNpmScript("release:check", {
            logPrefix: "deploy:all",
            env: { ASOL_RELEASE_REVISION: publishContext.revision },
          });
          serving = true;
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          if (report?.state === "READY") {
            throw new Error(`Vercel reported READY, but production is not serving this build: ${detail}`);
          }
          const readinessDetail =
            report?.message ||
            (report ? `Main deployment is ${report.state}.` : "Main deployment readiness was not queried in this branch run.");
          throw new Error(
            `${readinessDetail} Production is not serving this build either: ${detail}`,
          );
        }
      },
    },
  );

  if (report && report.state !== "READY" && !serving) {
    throw new Error(report.message || `Main deployment is ${report.state}.`);
  }
  if (report && report.state !== "READY") {
    console.log(
      `[deploy:all] Vercel reported ${report.state}, but production is serving this build — ` +
        "treating the main target as deployed.",
    );
  }

  await executeBranch(
    context,
    {
      branchId: "deployed-smoke",
      phase: "main",
      command: "smoke:deployed",
      label: "deployed origins answer their data routes",
    },
    {
      selected: selectedIncludes(selection, "deployed-smoke"),
      revision: publishContext.revision,
      inputHash: sourceHashFor(context),
      run: () => runDeploymentNpmScript("smoke:deployed", { logPrefix: "deploy:all" }).then(() => undefined),
    },
  );
  return mainReport;
}

async function main(): Promise<void> {
  const { flags, phase } = parseArgv(process.argv.slice(2));

  if (phase.listPhases) {
    console.log("[deploy:all] Phases (in order):\n" + formatPhaseList());
    console.log("\n[deploy:all] Runbook:\n" + formatDeployAllRunbook());
    console.log(
      "\nAliases:\n" +
        `  --phase=${SERVICES_PHASE_ALIAS}  all six CLI service deploys\n` +
        "\nExamples:\n" +
        "  npm run deploy:all -- --phase=preflight\n" +
        "  npm run deploy:all -- --phase=publish\n" +
        "  npm run deploy:all -- --phase=submain\n" +
        "  npm run deploy:all -- --from-phase=notifications\n" +
        "\nBranch-level resume:\n" +
        "  npm run deploy:all -- --from-branch=<runbookBranchId>    resume at one branch and run the rest\n" +
        "  npm run deploy:all -- --rerun-branch=<runbookBranchId>   re-run exactly one branch\n" +
        "  npm run deploy:all -- --rerun-failed                     resume at the earliest recorded failure\n" +
        "  npm run deploy:all -- --service-smoke-rebuild            force smoke:services to rebuild each service\n",
    );
    return;
  }

  const phasesToRun = resolvePhasesToRun(phase);
  const runningFullRelease =
    phasesToRun.length === DEPLOY_ALL_PHASE_ORDER.length &&
    phasesToRun.every((id, index) => id === DEPLOY_ALL_PHASE_ORDER[index]);

  let publishContext = resolvePublishContext(phase, readDeployAllState());
  const runContext = createRunContext(phase);
  if (phase.resumeDescription) {
    console.log(`[deploy:all] Resume request: ${phase.resumeDescription}.`);
  }
  // Child gates read these. They scope gate reuse to this invocation and this
  // revision; neither is a secret and neither changes what a gate verifies.
  process.env.ASOL_DEPLOY_RUN_ID = runContext.gateRunId;
  process.env.ASOL_DEPLOY_REVISION_AT_START = runContext.headRevision;
  if (flags.serviceSmokeRebuild) process.env.ASOL_SERVICE_SMOKE_REBUILD = "1";
  const reports: VercelDeploymentReport[] = [];
  const completedInBatch = new Set<DeployAllPhaseId>();

  // Announce the run to tooling outside this process. Preflight phases rewrite
  // tracked files as they go, and a guard that answers a dirty tree by pushing
  // would cancel this run's own main deployment — the main app redeploys on
  // every push to `main`. Cleared in the finally below, whatever the outcome.
  markDeployInFlight();
  try {
  await ensureReleaseSecretsRestored("deploy:all");
  for (const phaseId of phasesToRun) {
    if (completedInBatch.has(phaseId)) continue;
    console.log(`\n[deploy:all] ── phase: ${phaseId} ──`);
    try {
      if (phaseId === "preflight") {
        assertMainBranch();
        assertDeploymentCredentials();
        await runPreflightPhase(flags, phase, runContext);
        if (flags.skipPreflight || phaseFullyCovered(runContext, "preflight")) {
          markPhaseComplete("preflight", { skipPreflight: flags.skipPreflight });
        } else {
          console.log(
            '[deploy:all] Phase "preflight" is not marked complete: this run did not cover every branch.',
          );
        }
        continue;
      }

      const prerequisites = requiredPrerequisites(phaseId, flags);
      if (prerequisites.length > 0) {
        assertPhasePrerequisites(phaseId, prerequisites);
      }

      if (phaseId === "publish") {
        publishContext = await runPublishPhase(flags, phase, runContext);
        if (phaseFullyCovered(runContext, "publish")) {
          markPhaseComplete("publish", publishContext);
        } else {
          writeDeployAllState({
            ...publishContext,
            skipPreflight: flags.skipPreflight,
            completedPhases: readDeployAllState()?.completedPhases ?? [],
            lastUpdated: new Date().toISOString(),
          });
          console.log(
            '[deploy:all] Phase "publish" is not marked complete: this run did not cover every branch.',
          );
        }
        continue;
      }

      if ((SERVICE_PHASE_IDS as readonly string[]).includes(phaseId)) {
        publishContext = resolvePublishContext(phase, readDeployAllState());
        if (!publishContext.revision) {
          throw new Error(
            'Publish phase has not run yet. Run "npm run deploy:all -- --phase=publish" first.',
          );
        }
        const servicePhases = phasesToRun.filter(
          (candidate): candidate is DeployAllServicePhaseId =>
            (SERVICE_PHASE_IDS as readonly string[]).includes(candidate) && !completedInBatch.has(candidate),
        );
        for (const servicePhase of servicePhases) {
          if (phaseHasSelectedBranches(phase, servicePhase)) continue;
          console.log(
            `[deploy:all] SKIP phase "${servicePhase}": no selected runbook branches. ` +
              "It stays incomplete, because nothing deployed it.",
          );
          completedInBatch.add(servicePhase);
        }
        const phaseTasks: Array<{ phaseId: DeployAllPhaseId; task: Promise<VercelDeploymentReport> }> =
          servicePhases.filter((servicePhase) => phaseHasSelectedBranches(phase, servicePhase)).map((servicePhase) => ({
            phaseId: servicePhase,
            task: runServicePhase(servicePhase, publishContext, runContext),
          }));
        console.log("[deploy:all] Starting all selected Vercel targets, then waiting for one combined report...");
        const outcomes = await Promise.allSettled(phaseTasks.map((entry) => entry.task));
        const failures: string[] = [];
        outcomes.forEach((outcome, index) => {
          const task = phaseTasks[index]!;
          completedInBatch.add(task.phaseId);
          if (outcome.status === "fulfilled") {
            reports.push(outcome.value);
            if (phaseFullyCovered(runContext, task.phaseId)) markPhaseComplete(task.phaseId);
            return;
          }
          if (outcome.reason instanceof DeploymentNpmScriptError && outcome.reason.report) {
            reports.push(outcome.reason.report);
          }
          failures.push(
            `${task.phaseId}: ${outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)}`,
          );
        });
        if (failures.length > 0) throw new Error(`Vercel target failures: ${failures.join(" | ")}`);
        continue;
      }

      if (phaseId === "main") {
        if (!phaseHasSelectedBranches(phase, "main")) {
          console.log(
            '[deploy:all] SKIP phase "main": no selected runbook branches. ' +
              "It stays incomplete, because nothing verified production.",
          );
          continue;
        }
        publishContext = resolvePublishContext(phase, readDeployAllState());
        const mainReport = await runMainPhase(phase, publishContext, runContext);
        if (mainReport) reports.unshift(mainReport);
        if (phaseFullyCovered(runContext, "main")) markPhaseComplete("main");
        console.log(
          mainReport
            ? `[deploy:all] Phase "main" completed (${mainReport.state}).`
            : '[deploy:all] Phase "main" branch selection completed.',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof DeploymentNpmScriptError && error.report) {
        reports.push(error.report);
      }
      printRetryHint(runContext, phaseId);
      // The rollback is only offered for a revision this run actually pushed,
      // or one an earlier phase already published — never for a failure that
      // stopped before the push, where there is nothing to revert.
      const rollbackRevision =
        runContext.pushedRevision ??
        (phaseId !== "preflight" && phaseId !== "publish" ? publishContext.revision : undefined);
      fail(`phase "${phaseId}" failed — ${message}`, rollbackRevision);
      printBranchLedger(runContext);
      printFinalSummary(reports);
      if (flags.continueOnError) {
        console.error("[deploy:all] Continuing because --continue-on-error is enabled.");
        continue;
      }
      return;
    }
  }

  printBranchLedger(runContext);
  printFinalSummary(reports);
  const coveredEveryBranch = runContext.ledger.every(
    (entry) => entry.status === "completed" || (entry.status === "skipped" && entry.fromCheckpoint),
  );
  if (runningFullRelease && coveredEveryBranch) {
    reportNativeSurfaceStatus();
    console.log(formatSuccessLine(flags.skipPreflight));
    writeDeployAllState({
      ...publishContext,
      skipPreflight: flags.skipPreflight,
      completedPhases: [...DEPLOY_ALL_PHASE_ORDER],
      lastUpdated: new Date().toISOString(),
    });
    return;
  }

  const completed = readDeployAllState()?.completedPhases ?? [];
  const remaining = DEPLOY_ALL_PHASE_ORDER.filter((id) => !completed.includes(id));
  if (remaining.length > 0) {
    console.log(
      `[deploy:all] Remaining phase(s): ${remaining.join(", ")}\n` +
        `Continue with: npm run deploy:all -- --from-phase=${remaining[0]}`,
    );
  } else {
    console.log("[deploy:all] All phases completed for this run.");
  }
  } finally {
    clearDeployInFlight();
  }
}

/**
 * Whether a store build is still required.
 *
 * `ota:publish` refuses while the native surface has changed since the last
 * store release, so the operator is told here rather than discovering it at the
 * next OTA attempt. Reported only — never re-baselined automatically.
 */
function reportNativeSurfaceStatus(): void {
  try {
    const report = inspectNativeCompatibility(resolveNativeBaseline(), ROOT);
    if (report.baselineMissing) {
      console.log(
        "\n[deploy:all] Native surface: no baseline tag resolved, so OTA compatibility cannot be proven.",
      );
      return;
    }
    if (report.requiresStoreRelease) {
      console.log(
        `\n[deploy:all] Native surface: ${report.changedPaths.length} path(s) and ` +
          `${report.changedNativeDependencies.length} native dependency change(s) since the last store release.\n` +
          "[deploy:all] `ota:publish` will refuse until a store build ships and the baseline is re-tagged.",
      );
      return;
    }
    console.log(
      "\n[deploy:all] Native surface unchanged since the last store release; OTA is available.",
    );
  } catch (error) {
    console.log(
      `\n[deploy:all] Native surface status unavailable: ${error instanceof Error ? error.message : error}`,
    );
  }
}

export const __testables = {
  parseFlags,
  parseArgv,
  resolvePhasesToRun,
  compareVersions,
  SCRATCH_FILE_PATTERNS,
  PREFLIGHT_SECTIONS: DEPLOY_ALL_PREFLIGHT_SECTIONS,
  PREFLIGHT_STEPS,
  DEPLOY_ALL_RUNBOOK,
  formatRunbook: formatDeployAllRunbook,
  RELEASE_MANIFEST,
  formatSuccessLine,
  FAIL_PREFIX,
  DEPLOY_ALL_PHASE_ORDER,
  SERVICES_PHASE_ALIAS,
  DEPLOY_FLAG_NAMES,
  VALUE_FLAG_PREFIXES,
  buildPreflightGraph,
  planPreflightWaves,
  assertPreflightGraphInvariants,
  findRunbookBranch,
};

/**
 * Only deploy when this file is the process entrypoint.
 *
 * Without the guard, merely importing the module — as a test does — would
 * commit and push to production.
 */
const invokedDirectly = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false;

if (invokedDirectly) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    fail(message);
  });
}
