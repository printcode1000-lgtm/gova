# deploy:all Resume, Checkpoints and Parallel Preflight

## Purpose

Explain how `npm run deploy:all` resumes, what it is allowed to reuse from an earlier run, how preflight branches are scheduled concurrently, and which steps may never be skipped for any reason.

This document describes operational behavior. It does not redefine the protected contracts in [Deployment Targets](./deployment-targets.md), [Release and Secrets](./release-and-secrets.md) or [Scripts and Workflows](./scripts-and-workflows.md); it applies them.

## Vocabulary

| Term | Meaning |
|---|---|
| Phase | One of the nine ordered stages: `preflight`, `publish`, the six service deployments, `main`. |
| Branch | One runbook step inside a phase, with a stable id (`lint`, `service-smoke`, `push-main`, `deployed-smoke`, …). |
| Checkpoint | A durable record of one branch result: command, phase, branch id, status, start/finish timestamps, commit SHA, input hash, redacted error summary. |
| Input hash | A content hash of the files the branch was proven against. |

Every branch id is listed by:

```bash
npm run deploy:all -- --list-phases
```

## Selecting where a run starts

Exactly one selector may be given per run. Two selectors are refused rather than merged.

| Selector | Runs |
|---|---|
| *(none)* | The whole release, proving everything. Checkpoints are never consulted. |
| `--phase=<phaseId>` | Only that phase. Unchanged behavior. |
| `--from-phase=<phaseId>` | That phase and every phase after it. Unchanged behavior. |
| `--from-branch=<runbookBranchId>` | That branch and every branch the runbook lists after it, across the remaining phases. |
| `--rerun-branch=<runbookBranchId>` | Exactly that branch, inside its own phase, and nothing else. |
| `--rerun-failed` | Resumes at the earliest branch a previous run recorded as failed. |

`--runbook-branches=<a,b,c>` still narrows a selection further; it never widens one.

`--rerun-failed` starts at the *earliest* failure rather than re-running each failed branch in isolation, because a later failure is usually the first one's consequence. Everything after that branch is re-proven in runbook order.

## Checkpoints

State lives beside the existing run state:

```text
.deploy-all/run-state.json          phase-level state (revision, runId, completed phases)
.deploy-all/branch-checkpoints.json branch-level results
.deploy-all/gate-steps.json         generated-gate step reuse inside one run
.deploy-all/service-builds/<svc>/   one parked service build per service
```

A checkpoint is only ever consulted by a run that asked to resume. A full `npm run deploy:all` proves the release from nothing.

Reuse requires **all** of:

1. The branch belongs to `preflight` — the only phase whose branches are verifications rather than effects.
2. The recorded status is `success`.
3. The recorded commit SHA equals the current one.
4. The recorded input hash equals the current one.

Anything unknown is a run, not a skip: no checkpoint, an empty hash, a changed SHA, a recorded failure.

### What a checkpoint may never replace

These are effects — they change the world, or they observe a world that changed — and no checkpoint can stand in for one:

- `secrets-backup` (the encrypted secrets backup)
- every git branch: `clear-git-lock`, `origin-main-current`, `stage-tree`, `commit-tree`, `verify-clean-tree`, `push-main`
- every publish guard in the `publish` phase
- the six remote deployments (`<service>-deploy-command`)
- production verification: `main-ready`, `main-serving`, `deployed-smoke`

The only thing that can say one of these is already done is `run-state.json` recording its **phase** complete **for the same revision**. That is a record of the effect, not a record of a check.

### Determinism and secrets

The checkpoint file is written with a fixed key order and entries sorted by branch id, so two runs producing the same results write byte-identical content apart from the timestamps the format requires.

No secret is written. A failure is reduced to one line before it is stored: first line only, length-bounded, with credential-shaped values and any value of a secret-named environment variable replaced by `[redacted]`.

### Input hashes

- Most preflight branches hash the source the shared gates read: `src/`, `packages/`, `scripts/`, `config/`, `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.js`.
- Documentation-sensitive preflight branches, currently `knowledge` and `architecture`, add `docs/` to that hash so a docs-only edit cannot reuse a stale checkpoint.
- Service deploy branches hash the mirrored `services/<name>/` folder — the bytes that would be uploaded.

`public/`, `out/` and generated mirrors are excluded on purpose: preflight rewrites files there as it runs, and a hash that moved every time a generator ran would disable reuse without making anything safer.

The source hash is computed once per run, from the run's starting state. A commit SHA alone is not sufficient, because `deploy:all` runs from a working tree that is still dirty — committing it is what the publish phase does.

## Parallel preflight

Preflight is a dependency graph, not a list. Concurrency is default-deny: a branch runs alongside others only when it is classified as parallel-safe, and any branch that is unclassified — including one added later — runs alone.

Ordering that is declared and asserted before every run:

- `knowledge` (docs generation) before `architecture`, which validates generated knowledge.
- `service-mirror-sync` before `service-mirror-verify` and `service-builds`.
- `service-builds` before `service-smoke`.
- `server-build` before `smoke` (`smoke:production`) and before `function-size`.
- `server-build` before `static-build`; any static/native payload verification must depend on `static-build`.
- Phase order supplies the rest: publish precedes every remote deployment, and every remote deployment precedes `main` verification and `smoke:deployed`.

Run concurrently: `lint`, `typecheck`, `architecture:check`, `simulation:coverage`, the UiRegistry pending check, the production doctor, the Vercel account check, mirror verification and the function-size budget.

Run alone: documentation generation, the full test gate, database preparation, both builds, the mirror sync, and both smoke gates — each writes tracked files, drives the database, or binds a port.

Two things stay sequential on purpose:

- **The six service builds inside `services:build`.** Six concurrent `next build` processes compete for the same memory and CPU on one machine, and a build that fails because it was starved reports as a service defect. The duplicate service build was removed instead — see below — which removes the same wall-clock cost without introducing a flaky gate.
- **The six service deployments**, which already run concurrently at the phase level (`Promise.allSettled` over all selected Vercel targets), because each waits on a remote build rather than a local one.

Failure handling differs by kind:

- An exclusive branch fails fast. Everything after a broken build would be measuring a build that does not exist.
- Parallel branches in one wave are all allowed to finish, and their failures are reported together. Three failures found once is one fix cycle; three sequential runs are three.

## Duplicate gate reuse

`build` and `build:static` share a long list of source checks (catalog validation, `architecture:check`, every `test:*-core` suite, the composition tests), and a full release also runs the `test` gate before them.

Inside one `deploy:all` invocation, a **read-only** gate step that already passed for the same source hash is reused instead of run again. Everything else always runs:

- generators (`branding:generate`, `app:init`, `maplibre:sync`)
- `services:sync`
- database steps (`db:ensure`, `db:schema:sync`)
- the build commands themselves

Build-specific checks stay in the build path that owns them — `test:console-command-parity` and `test:deploy-runbook-execution` remain part of `build:static`, and the database steps remain part of `build`.

Reuse is scoped by a run id that only `deploy:all` sets. A standalone `npm run build` has no run id and re-proves everything, exactly as before.

## Service build and smoke reuse

`services:build` builds each service the way Vercel builds it, then moves the output **out** of the service folder into `.deploy-all/service-builds/<service>/`, recording the content hash of the mirrored folder it built from.

`smoke:services` starts that exact output when the hash still matches, and builds the service itself when it does not — so running the gate alone, with no preceding phase and no cache, behaves as it always did.

Two invariants are unchanged:

- **No `.next` survives inside `services/*`.** The Vercel CLI uploads those folders verbatim. The output is moved in, probed, and moved back out in a `finally`, whatever the probe did.
- **A changed mirror is rebuilt.** Reuse is keyed on the bytes that would be uploaded.

`npm run deploy:all -- --service-smoke-rebuild` (or `npx tsx scripts/check-service-smoke.ts --rebuild`) forces the previous build-every-time behavior.

## Deployed smoke origins

`smoke:deployed` asks the seven deployed origins for a route that reaches their own data. It resolves each origin as:

1. The explicit `NEXT_PUBLIC_ASOL_*_URL` environment value, when set.
2. Otherwise the canonical production constant declared in `@asol/native-core` — the same declaration `build:static` bakes into the static and native bundles.

No account is ever skipped. If neither source yields an absolute URL, the gate fails and names the account.

## Failure reporting

On failure the run prints, in order:

1. The smallest retry command — `--rerun-branch=<id>` — then `--from-branch=<id>`, then `--rerun-failed`, and only then the phase-level commands.
2. The pushed revision and its rollback commands, whenever the deployment commit already reached GitHub.
3. A branch table: every branch with its phase, command, status, duration, and — for each skip — whether it came from a valid checkpoint or merely from the current selection.

The same branch table is printed on success, so a resumed run states plainly how much it proved and how much it reused.

## Safety invariants

1. A full run consults no checkpoint.
2. A checkpoint may only replace a preflight verification, and only at the same commit SHA and the same input hash.
3. Publishing, git writes, the secret backup, remote deployments and production verification are never skipped by a checkpoint; only recorded phase completion at the same revision can prove them.
4. Preflight ordering invariants are asserted before the phase runs; a missing edge stops the release.
5. Concurrency is opt-in per branch; anything unclassified runs alone.
6. No secret is written to any checkpoint or ledger file.
7. No `.next` remains inside `services/*` after a run.
8. Every gate still runs at least once per release; reuse removes repetition, never coverage.

## Related

- [Deployment Targets](./deployment-targets.md) — the seven accounts and what deploys where.
- [Release and Secrets](./release-and-secrets.md) — secret archive and restore contract.
- [Scripts and Workflows](./scripts-and-workflows.md) — command inventory and the `main`-only rule.
- [Release Command Center](./capacitor/release-command-center.md) — the console that renders the same runbook.
