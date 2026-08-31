# ASOL Control Local Runner Operations Log

This is the durable incident and correct-behavior record for the ASOL Control cutover. The master execution plan remains `note/asol-control-single-agent-execution-plan.md`.

## Correct operating behavior

- GitHub is the control plane; `/home/hesham/gova` is the canonical host workspace.
- Repository edits run in isolated worktrees and land through the serialized `local-agent-main` path.
- Host-bound production operations use the explicit `canonical-host` execution target after the runner proves `main`, tracked cleanliness, and `HEAD == origin/main`.
- Never copy release credentials into an isolated worktree to make a production command pass.
- Never clear unexplained tracked drift with a broad reset. Inspect provenance and restore only proven generated artifacts.
- Keep mutation concurrency at one for production-affecting work.
- A `deploy:all` failure in preflight means no production mutation has started. Retry the smallest safe branch/checkpoint after fixing the cause.
- After mutation starts, allow the release orchestrator's compensation/rollback to finish before any manual recovery.
- While a GitHub job is running, decoded job logs may return `BlobNotFound`; poll job/step state, then refetch the finalized log after terminal state.
- Every real child-process smoke test must have both an internal deadline and guaranteed cleanup on assertion/guard failure.

## Incident 1 — stale generated knowledge

**Symptom:** `docs:ci` blocked the first cutover attempt.

**Root cause:** generated knowledge was stale.

**Recovery:** regenerate and verify before continuing.

## Incident 2 — canonical/worktree documentation nondeterminism

**Symptom:** the same revision generated different knowledge in `/home/hesham/gova` and a clean worktree.

**Root cause:** ignored `android/local.properties` entered the filesystem scan on the canonical host.

**Recovery:** exclude only `android/local.properties`; a broader Git-visible-only scan was rejected because intentionally modeled ignored iOS configuration would disappear. A synthetic local.properties invariance test proved the narrow fix.

## Incident 3 — isolated deployment lacked host-bound Vercel state

**Symptom:** `deploy:all` could not access local Vercel project/account state from the isolated worktree.

**Root cause:** deployment legitimately depends on canonical host state such as `.vercel/project.json` and locally restored credentials.

**Recovery:** do not copy secrets. Run host-bound production operations from the canonical host target under the same locks and safety guards.

## Incident 4 — dirty canonical workspace refusal

**Symptom:** a production attempt refused to start because tracked generated files were dirty.

**Assessment:** the refusal was correct fail-closed behavior.

**Recovery:** inspect the exact five generated diffs, prove their source, fix nondeterminism, then restore only those proven generated artifacts.

## Incident 5 — data-health test inherited GitHub runtime

**Symptom:** `test:data-health` treated a synthetic development case as non-development.

**Root cause:** `GITHUB_ACTIONS=true` was not isolated even though the runtime resolver consumes it.

**Recovery:** save/reset/restore all relevant runtime inputs and prove the test under hostile inherited CI context.

## Incident 6 — dev-cloud-backup inherited multiple runtime inputs

**Symptom:** `devCloudBackupEnvironment().allowed` unexpectedly returned false.

**Root cause:** inherited `GITHUB_ACTIONS`, Vercel, data-source, and provisioning values leaked into the fixture.

**Recovery:** make the policy test hermetic across the complete runtime input set.

## Incident 7 — release-command test failed then held the runner for one hour

**Symptom:** `test:release-commands` raised `googlePlayConsoleDevelopmentOnly` inside `verifyCancellationPaths`, but the GitHub job remained alive until the 60-minute workflow timeout.

**Root cause:** runtime isolation had been applied only to the earlier real runner smoke. The cancellation test still inherited GitHub runtime. It had already spawned an interval child process and lacked a `finally` cleanup path, so the failed assertion/guard left a live child keeping the Node process alive.

**Recovery:** run both development-only build-job tests through one synthetic-development-runtime helper and make spawned-child cleanup unconditional. The outer runner also now has per-command deadlines.

**Do not repeat:** never fix only the first development-only call site when a test file exercises the same guarded service elsewhere; never spawn a persistent child without `finally` cleanup.

## Incident 8 — running job log returned BlobNotFound

**Symptom:** decoded job log endpoint returned 404 `BlobNotFound` while the job remained in progress.

**Root cause:** finalized log blob publication lags live job/step status.

**Recovery:** use live status while running and fetch the final decoded log after terminal state.

## Incident 9 — first runner-hardening patch failed typecheck

**Symptom:** TypeScript reported unterminated string literals in `local-agent-main-apply.ts`.

**Root cause:** a Python-generated TypeScript patch interpreted `\n` too early, writing a physical newline inside a TypeScript string literal.

**Recovery:** the runner correctly refused to commit because `typecheck` was the verification gate. The retry escaped the generator input correctly, reran local-agent unit/workflow/CI-policy tests, and then typecheck.

## Incident 10 — new request field used before gateway supported it

**Symptom:** a retry request containing `timeout_minutes` was rejected by the old gateway contract.

**Assessment:** correct fail-closed behavior.

**Recovery:** bootstrap the runner hardening through the legacy contract first. After commit `988251462b0aa5dd95548980cde0859ffad42877`, `timeout_minutes` and explicit `execution_target` became supported inputs.

## Runner hardening now implemented

- Explicit `isolated-worktree` versus `canonical-host` execution target.
- Per shell/verification command deadline bounded below the workflow timeout.
- Structured operation stage/progress/failure telemetry.
- Canonical-host pre/post Git state capture and fail-closed cleanliness/synchronization checks.
- Canonical-host refuses repository patches and implicit tracked cleanup/commit.
- Regression coverage for target/timeout request validation.
- Explicit hidden-file inspection without widening ignored-directory traversal.

## Future development backlog

1. Host-capability manifest for Vercel linkage, Android SDK, signing-material presence status, and toolchain versions.
2. Shared `withSyntheticRuntimeEnvironment()` utility in test infrastructure so feature tests do not each maintain the runtime key list.
3. A dedicated hostile-CI-context gate for every development-only policy test.
4. Clean-worktree versus canonical-host generated-knowledge determinism gate.
5. Structured release evidence bundle: request/run/job IDs, terminal-log hash, branch report, deployment IDs, readiness/smoke reports, final SHA, rollback result.
6. Automatic finalized-log retry after terminal state when an earlier read returned `BlobNotFound`.
7. Failure classifier integrated with deployment branches (`admission`, `workspace`, `test-isolation`, `preflight`, `production-mutation`, `rollback`, `observability`, `timeout`).
8. Canonical host lease that also detects non-runner/manual tracked mutations during a host-bound operation.
9. Safe generator-owned artifact cleanup primitive based on provenance rather than generic reset.
10. Automatic smallest-safe `deploy:all` resume command surfaced from branch checkpoints.
11. Runner disk/orphan/stale-lock/workspace-divergence monitor with fail-closed ownership rules.
12. Periodic pruning/archival of stale agent registry entries so status output emphasizes live operators.

## Closure rule

Do not mark the master ASOL plan complete from local gates alone. Completion requires the production cutover, production readiness/serving checks, deployed smoke, correct origin/data-plane behavior, final checkpoint/handoff update, and no unresolved rollback state.

## Incident 11 — exact-file inspect patch broke TypeScript escaping

**Symptom:** the first production cutover after the release-command fix failed immediately in parallel preflight: both `typecheck` and `lint` reported unterminated literals in `scripts/local-agent-inspect.ts`.

**Root cause:** the generated patch for exact hidden-file inspection interpreted newline escape sequences while constructing TypeScript source, leaving physical newlines inside a regular-expression literal and string literals. The earlier verification for that change ran the release-command and local-agent suites plus `docs:ci`, but did not include global `typecheck`/`lint`, so the syntax defect escaped that narrower gate.

**Recovery:** rewrite the whole `searchFiles` function with literal-safe source generation, then run global `typecheck`, global `lint`, exact-file inspect smoke, local-agent control-plane tests, docs generation, and docs CI before retrying production.

**Do not repeat:** any generated TypeScript patch that contains backslash escapes must be validated by the global parser/typecheck and lint gates before it can become a production-cutover prerequisite.

