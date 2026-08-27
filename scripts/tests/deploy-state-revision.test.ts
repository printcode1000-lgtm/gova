import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const originalCwd = process.cwd();
const sandbox = mkdtempSync(path.join(tmpdir(), "asol-deploy-state-revision-"));

async function main(): Promise<void> {
process.chdir(sandbox);
try {
  const {
    assertPhasePrerequisites,
    createDeployAllState,
    deployAllStatePath,
    markPhaseComplete,
    readDeployAllState,
    rebindDeployAllStateRevision,
  } = await import("@asol/release-core");

  const revisionA = "a".repeat(40);
  const revisionB = "b".repeat(40);
  const fingerprintA = "1".repeat(64);
  const fingerprintB = "2".repeat(64);

  createDeployAllState({ revision: revisionA, sourceFingerprint: fingerprintA });
  markPhaseComplete("preflight", { revision: revisionA, sourceFingerprint: fingerprintA });
  assert.doesNotThrow(() =>
    assertPhasePrerequisites(
      "publish",
      ["preflight"],
      { revision: revisionA, sourceFingerprint: fingerprintA },
    ),
  );
  assert.throws(
    () =>
      assertPhasePrerequisites(
        "publish",
        ["preflight"],
        { revision: revisionB, sourceFingerprint: fingerprintA },
      ),
    /cannot use deploy proof from another source identity/,
    "SHA-A preflight must not authorize SHA-B publish.",
  );
  assert.throws(
    () =>
      assertPhasePrerequisites(
        "publish",
        ["preflight"],
        { revision: revisionA, sourceFingerprint: fingerprintB },
      ),
    /cannot use deploy proof from another source identity/,
    "Changed inputs on the same SHA must invalidate prerequisite proof.",
  );

  const stateB = createDeployAllState({ revision: revisionB, sourceFingerprint: fingerprintB });
  assert.deepEqual(stateB.completedPhases, [], "Starting SHA-B must discard active SHA-A phase proof.");
  assert.deepEqual(readDeployAllState()?.completedPhases, []);
  assert.throws(
    () =>
      assertPhasePrerequisites(
        "publish",
        ["preflight"],
        { revision: revisionB, sourceFingerprint: fingerprintB },
      ),
    /requires completed phase/,
    "Fresh SHA-B state cannot enter publish before SHA-B preflight.",
  );

  markPhaseComplete("preflight", { revision: revisionB, sourceFingerprint: fingerprintB });
  assert.doesNotThrow(() =>
    assertPhasePrerequisites(
      "publish",
      ["preflight"],
      { revision: revisionB, sourceFingerprint: fingerprintB },
    ),
    "Same-source phase proof remains usable.",
  );

  const deploymentRevision = "c".repeat(40);
  const rebound = rebindDeployAllStateRevision({
    fromRevision: revisionB,
    toRevision: deploymentRevision,
    validatedSourceFingerprint: fingerprintB,
    committedSourceFingerprint: fingerprintB,
  });
  assert.equal(rebound.revision, deploymentRevision);
  assert.deepEqual(
    rebound.completedPhases,
    ["preflight"],
    "The explicit validated-tree-to-deployment-commit transition preserves proof.",
  );
  assert.throws(
    () =>
      rebindDeployAllStateRevision({
        fromRevision: deploymentRevision,
        toRevision: "d".repeat(40),
        validatedSourceFingerprint: fingerprintA,
        committedSourceFingerprint: fingerprintA,
      }),
    /cannot use deploy proof from another source identity/,
    "A revision transition cannot relabel proof with a different fingerprint.",
  );
  assert.throws(
    () =>
      rebindDeployAllStateRevision({
        fromRevision: deploymentRevision,
        toRevision: "d".repeat(40),
        validatedSourceFingerprint: fingerprintB,
        committedSourceFingerprint: fingerprintA,
      }),
    /does not match the source validated by preflight/,
    "The explicit deployment-commit transition requires byte-identical validated inputs.",
  );

  writeFileSync(
    deployAllStatePath(),
    `${JSON.stringify({ revision: revisionA, completedPhases: ["preflight"] })}\n`,
    "utf8",
  );
  assert.equal(readDeployAllState(), undefined, "Legacy or ambiguous state is untrusted.");

  console.log("deploy state revision binding tests passed.");
} finally {
  process.chdir(originalCwd);
  rmSync(sandbox, { recursive: true, force: true });
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
