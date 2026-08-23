import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

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
 * Publish and main are not — every branch there must be selected by the
 * executor via `selectedIncludes` / `runSelectedPublishBranch` with a string
 * literal branch id. A comment or dead string mentioning the id is not ownership.
 */
const ROOT = process.cwd();
const EXECUTOR = path.join(ROOT, "scripts", "deploy-all.ts");

/** Calls that gate whether a hand-coded runbook branch actually runs. */
const OWNERSHIP_CALLEES = new Set(["selectedIncludes", "runSelectedPublishBranch"]);

function isLoopExecutedPhase(phaseId: string): boolean {
  if (phaseId === "preflight") {
    // `runPreflightPhase` walks DEPLOY_ALL_PREFLIGHT_SECTIONS.
    void DEPLOY_ALL_PREFLIGHT_SECTIONS;
    return true;
  }
  return (SERVICE_PHASE_IDS as readonly string[]).includes(phaseId);
}

/**
 * Collect branch ids that the executor genuinely selects for execution.
 *
 * Only string-literal arguments to `selectedIncludes` / `runSelectedPublishBranch`
 * count. Comments, unrelated string literals, object `id` fields used only for
 * logging, and documentation text do not prove ownership.
 */
function collectOwnedBranchIds(executorSource: string): Set<string> {
  const sourceFile = ts.createSourceFile(
    EXECUTOR,
    executorSource,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );
  const owned = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const callee = node.expression.text;
      if (OWNERSHIP_CALLEES.has(callee) && node.arguments.length >= 2) {
        const branchArg = node.arguments[1];
        if (ts.isStringLiteral(branchArg) || ts.isNoSubstitutionTemplateLiteral(branchArg)) {
          owned.add(branchArg.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return owned;
}

function executorIteratesPreflightSections(executorSource: string): boolean {
  const sourceFile = ts.createSourceFile(
    EXECUTOR,
    executorSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let found = false;
  const visit = (node: ts.Node): void => {
    if (
      ts.isForOfStatement(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "DEPLOY_ALL_PREFLIGHT_SECTIONS"
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function executorReferencesServicePhaseIds(executorSource: string): boolean {
  const sourceFile = ts.createSourceFile(
    EXECUTOR,
    executorSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let found = false;
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === "SERVICE_PHASE_IDS") {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

const executorSource = readFileSync(EXECUTOR, "utf8");
assert.ok(
  executorIteratesPreflightSections(executorSource),
  "scripts/deploy-all.ts must still drive preflight by iterating DEPLOY_ALL_PREFLIGHT_SECTIONS.",
);
assert.ok(
  executorReferencesServicePhaseIds(executorSource),
  "scripts/deploy-all.ts must still drive service phases via SERVICE_PHASE_IDS.",
);

const ownedBranchIds = collectOwnedBranchIds(executorSource);
const declared = deployAllBranchIds();
assert.ok(declared.length > 0, "DEPLOY_ALL_RUNBOOK must declare at least one branch.");

const inert: string[] = [];
for (const phase of DEPLOY_ALL_RUNBOOK) {
  for (const section of phase.sections) {
    for (const branch of section.branches) {
      if (isLoopExecutedPhase(phase.id)) continue;
      if (ownedBranchIds.has(branch.id)) continue;
      inert.push(`${branch.id} (phase: ${phase.id})`);
    }
  }
}

assert.deepEqual(
  inert,
  [],
  `Declared deploy:all runbook branch(es) are never executed by scripts/deploy-all.ts.\n` +
    `They will be shown on /dev/deploy-all and documented while never running.\n` +
    `Either drive their phase by iterating the runbook (like preflight) or select ` +
    `the branch via selectedIncludes / runSelectedPublishBranch with a string-literal id.\n\n` +
    inert.join("\n"),
);

console.log(
  `Deploy runbook execution contract passed (${declared.length} branches covered).`,
);
