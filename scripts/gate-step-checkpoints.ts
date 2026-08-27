import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { deployAllStateDir, hashSharedGateSources } from '@asol/release-core';

/**
 * Remember which generated-gate steps this deploy run already proved.
 *
 * `build` and `build:static` are two release gates over one repository, and
 * their shared section is long: catalog validation, the catalog studio test,
 * `architecture:check`, every `test:*-core` suite, the composition tests. A
 * full `deploy:all` runs the `test` gate, then `build`, then `build:static`,
 * so those suites execute three times against source that cannot have changed
 * between them — nothing in the pipeline edits `src/` or `packages/` while it
 * runs.
 *
 * Reuse here removes the repetition without removing a check: every gate step
 * still runs, once, inside the same deploy run, and its result is only reused
 * for a step with the same name and the same source hash. Outside a deploy run
 * there is no run id and nothing is reused — a standalone `npm run build`
 * behaves exactly as it did before.
 *
 * What is never reusable is anything that acts rather than verifies. Generators
 * (`branding:generate`, `app:init`, `maplibre:sync`), mirror sync, database
 * preparation, and the build commands themselves are excluded by construction:
 * only names matching the read-only verification patterns below can be reused.
 */
interface GateStepRecord {
  readonly sourceHash: string;
  readonly finishedAt: string;
  readonly gateId: string;
}

interface GateStepLedger {
  readonly version: 1;
  readonly runId: string;
  readonly steps: Record<string, GateStepRecord>;
}

const LEDGER_FILE_NAME = 'gate-steps.json';

/**
 * Steps that only read.
 *
 * An allowlist, not a denylist: a step whose name is not matched here always
 * runs. Adding a mutating script therefore costs nothing and forgetting to
 * classify one is safe.
 */
const REUSABLE_GATE_STEP_PATTERNS: readonly RegExp[] = [
  /^test:/,
  /^catalog:validate$/,
  /^category:validate$/,
  /^architecture:check$/,
  /^validate:/,
  /^ios:push:validate$/,
  /^android:[a-z0-9-]+:validate$/,
];

export function gateStepLedgerPath(): string {
  return path.join(deployAllStateDir(), LEDGER_FILE_NAME);
}

export function isReusableGateStep(step: { kind: string; value: string }): boolean {
  if (step.kind !== 'npm-script') return false;
  return REUSABLE_GATE_STEP_PATTERNS.some((pattern) => pattern.test(step.value));
}

/** The deploy run this gate belongs to, or undefined when the gate runs on its own. */
export function currentDeployRunId(): string | undefined {
  const runId = process.env.ASOL_DEPLOY_RUN_ID?.trim();
  return runId ? runId : undefined;
}

let cachedSourceHash: string | undefined;

export function currentSourceHash(): string {
  if (cachedSourceHash === undefined) {
    cachedSourceHash = hashSharedGateSources(process.cwd());
  }
  return cachedSourceHash;
}

function readLedger(): GateStepLedger | undefined {
  const file = gateStepLedgerPath();
  if (!existsSync(file)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as GateStepLedger;
    if (!parsed.steps || typeof parsed.steps !== 'object') return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeLedger(ledger: GateStepLedger): void {
  mkdirSync(deployAllStateDir(), { recursive: true });
  const steps: Record<string, GateStepRecord> = {};
  for (const key of Object.keys(ledger.steps).sort()) {
    steps[key] = ledger.steps[key]!;
  }
  writeFileSync(
    gateStepLedgerPath(),
    `${JSON.stringify({ version: 1, runId: ledger.runId, steps }, null, 2)}\n`,
    'utf8',
  );
}

/** Whether this exact step already passed in this deploy run, against this source. */
export function gateStepAlreadyProven(stepName: string): GateStepRecord | undefined {
  const runId = currentDeployRunId();
  if (!runId) return undefined;
  const ledger = readLedger();
  if (!ledger || ledger.runId !== runId) return undefined;
  const record = ledger.steps[stepName];
  if (!record) return undefined;
  return record.sourceHash === currentSourceHash() ? record : undefined;
}

export function recordGateStep(stepName: string, gateId: string): void {
  const runId = currentDeployRunId();
  if (!runId) return;
  const existing = readLedger();
  const steps = existing?.runId === runId ? { ...existing.steps } : {};
  steps[stepName] = {
    sourceHash: currentSourceHash(),
    finishedAt: new Date().toISOString(),
    gateId,
  };
  writeLedger({ version: 1, runId, steps });
}
