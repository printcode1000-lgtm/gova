import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { SERVICE_PHASE_IDS } from "@asol/release-core";
import {
  DEPLOY_ALL_PREFLIGHT_SECTIONS,
  DEPLOY_ALL_RUNBOOK,
  deployAllBranchIds,
} from "@asol/release-core/console";

/**
 * A declared runbook branch that the executor never runs is invisible until
 * someone notices the page promised it.
 *
 * That already happened: `main-serving` (`release:check`) was added to
 * `DEPLOY_ALL_RUNBOOK` and never executed, because the `main` phase is
 * hand-coded — it called `verifyMainDeployment` and threw on any non-READY
 * state. The branch stayed on `/dev/deploy-all` and in the docs while the
 * pipeline skipped it. Wired by hand later in `b0d5840`.
 *
 * Preflight is safe: `runPreflightPhase` iterates `DEPLOY_ALL_PREFLIGHT_SECTIONS`.
 * Service phases are safe: `main()` runs each `SERVICE_PHASE_IDS` entry.
 * Publish and main are not — every branch there must be named in
 * `scripts/deploy-all.ts`, or it will never run.
 */
const ROOT = process.cwd();
const EXECUTOR = path.join(ROOT, "scripts", "deploy-all.ts");

function isLoopExecutedPhase(phaseId: string): boolean {
  if (phaseId === "preflight") {
    // `runPreflightPhase` walks DEPLOY_ALL_PREFLIGHT_SECTIONS.
    void DEPLOY_ALL_PREFLIGHT_SECTIONS;
    return true;
  }
  return (SERVICE_PHASE_IDS as readonly string[]).includes(phaseId);
}

function isExplicitlyNamed(executorSource: string, branchId: string): boolean {
  return (
    executorSource.includes(JSON.stringify(branchId)) ||
    executorSource.includes(`'${branchId}'`)
  );
}

const executorSource = readFileSync(EXECUTOR, "utf8");
assert.ok(
  executorSource.includes("DEPLOY_ALL_PREFLIGHT_SECTIONS"),
  "scripts/deploy-all.ts must still drive preflight by iterating DEPLOY_ALL_PREFLIGHT_SECTIONS.",
);
assert.ok(
  executorSource.includes("SERVICE_PHASE_IDS"),
  "scripts/deploy-all.ts must still drive service phases via SERVICE_PHASE_IDS.",
);

const declared = deployAllBranchIds();
assert.ok(declared.length > 0, "DEPLOY_ALL_RUNBOOK must declare at least one branch.");

const inert: string[] = [];
for (const phase of DEPLOY_ALL_RUNBOOK) {
  for (const section of phase.sections) {
    for (const branch of section.branches) {
      if (isLoopExecutedPhase(phase.id)) continue;
      if (isExplicitlyNamed(executorSource, branch.id)) continue;
      inert.push(`${branch.id} (phase: ${phase.id})`);
    }
  }
}

assert.deepEqual(
  inert,
  [],
  `Declared deploy:all runbook branch(es) are never executed by scripts/deploy-all.ts.\n` +
    `They will be shown on /dev/deploy-all and documented while never running.\n` +
    `Either drive their phase by iterating the runbook (like preflight) or name ` +
    `the branch id explicitly in the executor.\n\n` +
    inert.join("\n"),
);

console.log(
  `Deploy runbook execution contract passed (${declared.length} branches covered).`,
);
