import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  decideCheckpointSkip,
  failedBranchIds,
  hashServiceInputs,
  planFromBranch,
  planRerunBranch,
  planRerunFailed,
  smallestRetryCommand,
} from "@asol/release-core";

/**
 * Non-publishing proof that resume, checkpointing and build reuse behave.
 *
 * Everything here runs against a throwaway working directory. Nothing builds,
 * nothing deploys, nothing touches the repository's own `.deploy-all/` state —
 * the point is to exercise the decisions a resumed release makes without
 * running a release to find out.
 *
 * The stores resolve `.deploy-all/` from the process working directory at
 * import time, so the directory is switched before they are imported.
 */
function report(line: string): void {
  console.log(`  ✔ ${line}`);
}

async function main(): Promise<void> {
const repositoryRoot = process.cwd();
const sandbox = mkdtempSync(path.join(tmpdir(), "asol-deploy-resume-"));
process.chdir(sandbox);

const { readBranchCheckpoints, recordBranchCheckpoint, clearBranchCheckpoints } = await import(
  "@asol/release-core"
);
const {
  restoreServiceBuild,
  returnServiceBuild,
  serviceInputHash,
  serviceSmokeRebuildRequested,
  storeServiceBuild,
} = await import("@asol/release-core");
const { gateStepAlreadyProven, isReusableGateStep, recordGateStep } = await import(
  "../gate-step-checkpoints"
);
const { resolveDeployedOrigin, ACCOUNT_ORIGIN_ENV } = await import("../deployed-origin-resolution");

try {
  const revision = "a".repeat(40);
  const inputHash = "b".repeat(64);
  const runId = "20260101000000000-abcdefabcdef";

  // ── 1. Branch-level retry ────────────────────────────────────────────────
  const rerun = planRerunBranch("service-smoke");
  assert.equal(rerun.onlyPhase, "preflight");
  assert.deepEqual([...rerun.selectedBranches], ["service-smoke"]);
  const resumed = planFromBranch("service-smoke");
  assert.ok(resumed.selectedBranches.has("push-main"), "A resume still runs the irreversible steps after it.");
  assert.ok(!resumed.selectedBranches.has("lint"), "A resume does not re-run what came before.");
  report("branch-level retry selects one branch, and resume selects that branch onwards");

  // ── 2. Checkpoint skip only for matching SHA and input hash ─────────────
  clearBranchCheckpoints();
  recordBranchCheckpoint(
    {
      branchId: "lint",
      phase: "preflight",
      command: "lint",
      status: "success",
      startedAt: "2026-01-01T00:00:00.000Z",
      finishedAt: "2026-01-01T00:00:30.000Z",
      revision,
      inputHash,
    },
    runId,
  );
  const stored = readBranchCheckpoints();
  assert.equal(stored.length, 1, "The checkpoint round-trips through disk.");
  assert.equal(stored[0]!.inputHash, inputHash);
  assert.equal(
    decideCheckpointSkip({ branchId: "lint", phaseId: "preflight", revision, inputHash, checkpoints: stored }).skip,
    true,
    "A matching checkpoint is reused.",
  );
  assert.equal(
    decideCheckpointSkip({ branchId: "lint", phaseId: "preflight", revision: "c".repeat(40), inputHash, checkpoints: stored }).skip,
    false,
    "A changed commit SHA must re-run the branch.",
  );
  assert.equal(
    decideCheckpointSkip({ branchId: "lint", phaseId: "preflight", revision, inputHash: "d".repeat(64), checkpoints: stored }).skip,
    false,
    "A changed input hash must re-run the branch.",
  );
  for (const [branchId, phaseId] of [
    ["push-main", "publish"],
    ["secrets-backup", "publish"],
    ["notifications-deploy-command", "notifications"],
    ["deployed-smoke", "main"],
  ] as const) {
    recordBranchCheckpoint(
      {
        branchId,
        phase: phaseId,
        command: "whatever",
        status: "success",
        startedAt: "2026-01-01T00:00:00.000Z",
        finishedAt: "2026-01-01T00:00:30.000Z",
        revision,
        inputHash,
      },
      runId,
    );
    assert.equal(
      decideCheckpointSkip({ branchId, phaseId, revision, inputHash, checkpoints: readBranchCheckpoints() }).skip,
      false,
      `${branchId} must never be skipped by a checkpoint.`,
    );
  }
  report("checkpoint reuse requires a matching SHA and input hash, and never covers an effect");

  // ── 3. A failed-branch retry starts at the smallest failed branch ───────
  clearBranchCheckpoints();
  for (const branchId of ["deployed-smoke", "types", "service-builds"]) {
    recordBranchCheckpoint(
      {
        branchId,
        phase: branchId === "deployed-smoke" ? "main" : "preflight",
        command: branchId,
        status: "failed",
        startedAt: "2026-01-01T00:00:00.000Z",
        finishedAt: "2026-01-01T00:00:30.000Z",
        revision,
        inputHash,
        errorSummary: "failed",
      },
      runId,
    );
  }
  const failed = failedBranchIds(readBranchCheckpoints());
  assert.deepEqual(failed, ["types", "service-builds", "deployed-smoke"], "Failures are ordered by the runbook.");
  const retryPlan = planRerunFailed(failed);
  assert.ok(retryPlan.selectedBranches.has("types"), "The earliest failure is where the retry starts.");
  assert.ok(!retryPlan.selectedBranches.has("lint"), "Nothing before the earliest failure is re-run.");
  assert.equal(smallestRetryCommand("types"), "npm run deploy:all -- --rerun-branch=types");
  clearBranchCheckpoints();
  report("a failed-branch retry starts at the smallest failed branch");

  // ── 4. Service smoke reuses a matching build ────────────────────────────
  const serviceDir = path.join(sandbox, "services", "notifications");
  mkdirSync(path.join(serviceDir, ".next"), { recursive: true });
  writeFileSync(path.join(serviceDir, "package.json"), '{"name":"notifications"}\n', "utf8");
  writeFileSync(path.join(serviceDir, ".next", "BUILD_ID"), "build-one\n", "utf8");

  const firstHash = serviceInputHash(sandbox, "notifications");
  assert.equal(firstHash, hashServiceInputs(sandbox, "notifications"), "The service hash is content-addressed.");
  storeServiceBuild("notifications", serviceDir, firstHash);
  assert.equal(
    existsSync(path.join(serviceDir, ".next")),
    false,
    "services:build must not leave a build inside a folder the CLI uploads verbatim.",
  );
  assert.equal(
    restoreServiceBuild("notifications", serviceDir, firstHash),
    true,
    "A build produced from these exact inputs is reusable.",
  );
  assert.equal(existsSync(path.join(serviceDir, ".next", "BUILD_ID")), true, "The reused build is the stored one.");
  returnServiceBuild("notifications", serviceDir, firstHash);
  assert.equal(
    existsSync(path.join(serviceDir, ".next")),
    false,
    "smoke:services must leave nothing behind under services/*.",
  );

  // A changed mirror invalidates the cache.
  writeFileSync(path.join(serviceDir, "route.ts"), "export const changed = true;\n", "utf8");
  const secondHash = serviceInputHash(sandbox, "notifications");
  assert.notEqual(secondHash, firstHash, "A changed mirror changes the hash.");
  assert.equal(
    restoreServiceBuild("notifications", serviceDir, secondHash),
    false,
    "A build from different inputs must never be reused.",
  );
  report("service smoke reuses a matching build and refuses a stale one, leaving no .next behind");

  // ── 5. Forced rebuild is always available ───────────────────────────────
  assert.equal(serviceSmokeRebuildRequested([]), false, "Reuse is the default.");
  assert.equal(serviceSmokeRebuildRequested(["--rebuild"]), true, "The CLI flag forces a rebuild.");
  process.env.ASOL_SERVICE_SMOKE_REBUILD = "1";
  assert.equal(
    serviceSmokeRebuildRequested([]),
    true,
    "deploy:all --service-smoke-rebuild must reach the smoke gate.",
  );
  delete process.env.ASOL_SERVICE_SMOKE_REBUILD;
  report("forced service smoke rebuild works from both the flag and deploy:all");

  // ── 6. Duplicated gate steps are reused only inside one run ─────────────
  assert.equal(isReusableGateStep({ kind: "npm-script", value: "test:auth-core" }), true);
  assert.equal(isReusableGateStep({ kind: "npm-script", value: "architecture:check" }), true);
  for (const mutating of ["branding:generate", "app:init", "services:sync", "db:ensure", "db:schema:sync", "maplibre:sync"]) {
    assert.equal(
      isReusableGateStep({ kind: "npm-script", value: mutating }),
      false,
      `${mutating} changes the tree and must always run.`,
    );
  }
  assert.equal(isReusableGateStep({ kind: "command", value: "next build" }), false, "A build always runs.");

  delete process.env.ASOL_DEPLOY_RUN_ID;
  recordGateStep("test:auth-core", "test");
  assert.equal(
    gateStepAlreadyProven("test:auth-core"),
    undefined,
    "Outside a deploy run nothing is remembered and nothing is reused.",
  );
  process.env.ASOL_DEPLOY_RUN_ID = runId;
  recordGateStep("test:auth-core", "test");
  assert.ok(gateStepAlreadyProven("test:auth-core"), "Inside one run, a proven read-only step is reused.");
  process.env.ASOL_DEPLOY_RUN_ID = `${runId}-other`;
  assert.equal(
    gateStepAlreadyProven("test:auth-core"),
    undefined,
    "A different deploy run must prove the gate again.",
  );
  delete process.env.ASOL_DEPLOY_RUN_ID;
  report("gate steps are reused only for read-only checks, inside one deploy run");

  // ── 7. Deployed smoke derives origins with no manual env ────────────────
  const originalEnv: Record<string, string | undefined> = {};
  for (const envVar of Object.values(ACCOUNT_ORIGIN_ENV)) {
    originalEnv[envVar] = process.env[envVar];
    delete process.env[envVar];
  }
  try {
    for (const account of Object.keys(ACCOUNT_ORIGIN_ENV)) {
      const resolved = resolveDeployedOrigin(account, {} as NodeJS.ProcessEnv);
      assert.equal(resolved.source, "declaration", `${account} must resolve without a manual variable.`);
      assert.match(resolved.origin, /^https:\/\/.+/, `${account} must resolve to an absolute origin.`);
      assert.doesNotMatch(resolved.origin, /\/$/, "Origins are stored without a trailing slash.");
    }
    const overridden = resolveDeployedOrigin("profiles", {
      NEXT_PUBLIC_ASOL_PROFILES_URL: "https://staging-profiles.example.com/",
    } as NodeJS.ProcessEnv);
    assert.equal(overridden.source, "environment", "An explicit override must still win.");
    assert.equal(overridden.origin, "https://staging-profiles.example.com");
  } finally {
    for (const [envVar, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[envVar];
      else process.env[envVar] = value;
    }
  }
  report("smoke:deployed derives canonical origins with no manual NEXT_PUBLIC_ASOL_* variables");

  console.log("deploy:all resume, checkpoint and reuse verification passed.");
} finally {
  process.chdir(repositoryRoot);
  rmSync(sandbox, { recursive: true, force: true });
}
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
