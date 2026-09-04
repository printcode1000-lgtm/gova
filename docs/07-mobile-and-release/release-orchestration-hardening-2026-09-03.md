# Release Orchestration Hardening — 2026-09-03

## Purpose

This record consolidates the release-orchestration repairs introduced by commit
`739c7c92664b7754b8480d6f4110b65b10bf1cda` (`deploy(push): repair release
orchestration`). It is the operational change record for the Vercel/GitHub
coordination fixes made on 2026-09-03. The normative behavior remains defined by
[Release Commands](./release-commands.md), [Deployment Targets](./deployment-targets.md),
and [GitHub CI Policy](./github-ci-policy.md).

> **Historical record — partly superseded on 2026-09-04.** Sections 1–3 below
> describe a world in which `main` still produced a Vercel Git deployment and
> `.github/workflows/deploy-main.yml` dispatched `deploy:revision` for ordinary
> pushes. Both are gone. `vercel.json` now disables Git deployments for **every**
> branch including `main`, the deployment workflow was deleted (only `docs.yml`
> and `local-agent-bootstrap.yml` may exist), and `deploy:revision` and the
> generic `deploy:push` were removed from `package.json`. `gova` is published
> only by the explicit `main:deploy` step inside the release transaction, and the
> only public release commands are `deploy:all` and `deploy:push:fast`. Read this
> document for *why* the coordination problem existed; read
> [GitHub CI Policy](./github-ci-policy.md) and
> [Release Commands](./release-commands.md) for what is true now. See
> [§ What replaced this design](#what-replaced-this-design).

## Incident summary

The release path had four interacting failure modes:

1. A `deploy:push` or `deploy:all` commit already ran the complete shared release
   transaction, but the subsequent push to `main` also triggered `deploy-main.yml`,
   which dispatched `deploy:revision` for the same SHA. Two production release
   transactions could therefore contend on the single-production-release lock.
2. The GitHub-linked `gova` Vercel project accepted Git deployments from branches
   other than `main`. Temporary/integration pushes could consume Hobby deployment
   capacity even though they were not production releases.
3. Vercel can reject a Git deployment immediately at the Git commit-status layer
   (notably the deployment/build rate limit) before a Vercel deployment record
   exists. The old release path could start deploying the six workloads and
   `control` before learning that the frontend could never publish.
4. If the Git deployment was rejected and `gova` never moved, rollback could still
   attempt to promote the already-serving baseline deployment. Vercel returns a
   conflict for that redundant promotion, turning a no-op restore into a rollback
   failure.

The observed external condition during the repair was the Vercel commit status
`Deployment rate limited — retry in 24 hours.` The repository repairs prevent
that external limit from causing unnecessary backend mutations or duplicate
release transactions; they do not bypass the Vercel account limit itself.

## Final behavior

### 1. Only `main` creates automatic Vercel Git deployments

`vercel.json` now uses:

```json
{
  "git": {
    "deploymentEnabled": {
      "*": false,
      "main": true
    }
  }
}
```

`ignoreCommand` is deliberately absent. `integration`, temporary coordination
branches, and every other non-`main` branch create no Vercel Git deployment.
This is stronger than an ignored-build command: an ignored build is still
created and canceled, so it can still consume deployment capacity.

### 2. Release-owned pushes do not dispatch a second release

`.github/workflows/deploy-main.yml` skips its `select-runner` job when the pushed
commit message starts with either:

- `deploy(push):`
- `deploy(main):`

Those prefixes are produced by `deploy:push` and `deploy:all`; both commands
already run the shared `runReleaseTransaction` after pushing. Ordinary direct
pushes to `main` still use the authenticated `deploy:revision` automation path.
This preserves direct-push deployment while preventing two transactions for one
SHA.

`scripts/github-ci-policy.ts` and its tests pin these two release-owned prefixes
so the skip cannot silently regress.

### 3. Immediate Vercel Git rejection is checked before production mutation

`scripts/deploy-push.ts` adds an exact-SHA Git-status gate:

- resolve the GitHub repository from `GITHUB_REPOSITORY` when present, otherwise
  from the `origin` remote;
- poll the commit status for up to 12 seconds for the `Vercel` context;
- abort on `failure` or `error` before `runReleaseTransaction` begins;
- recognize rate-limit text/URLs and return an explicit rate-limit diagnostic;
- if GitHub status cannot be read, or no immediate Vercel status appears, fall
  back to the existing exact-SHA Vercel deployment verification rather than
  pretending success.

The guard runs in both publishing paths:

- `deploy:push`: after the GitHub push has been verified and before the rollback
  baseline or any workload/control deployment is mutated;
- `deploy:revision`: before Vercel account verification and before the shared
  transaction starts.

A rejected frontend SHA therefore cannot trigger a full backend deployment cycle.

### 4. Rollback is idempotent when the baseline is already Production

`packages/vercel-deploy-core/src/release-rollback.ts` now checks the current READY
production deployment before calling Vercel's promote endpoint. If the current
production deployment ID already equals the captured baseline ID, promotion is
skipped and the restore is treated as successful.

This specifically covers the case where `gova` never moved because its Git
build was rejected. It also makes repeated rollback attempts safe and avoids a
redundant Vercel promote request returning `409`.

### 5. Generated repository knowledge was refreshed

Adding `GITHUB_REPOSITORY` consumption to `scripts/deploy-push.ts` changed the
repository knowledge graph. `npm run docs:generate` refreshed the generated
catalog/graph reports so environment-consumer counts and graph-edge totals match
the source.

## Files changed by the repair commit

### Runtime and orchestration

| File | Change |
| --- | --- |
| `.github/workflows/deploy-main.yml` | Skip `deploy(push):` and `deploy(main):` release-owned commits. |
| `vercel.json` | Disable Git deployments for every branch except `main`; remove ignored-build behavior. |
| `scripts/deploy-push.ts` | Add GitHub repository resolution and exact-SHA Vercel commit-status rejection gate; expose helpers for tests. |
| `packages/vercel-deploy-core/src/release-rollback.ts` | Make promotion idempotent when the captured deployment is already Production. |
| `scripts/github-ci-policy.ts` | Make release-owned commit prefixes part of the enforced deployment-workflow contract. |

### Tests

| File | Coverage added |
| --- | --- |
| `scripts/tests/deploy-push.test.ts` | Repository URL parsing; failed Vercel status; rate-limit diagnostic; pending status; timeout/fallback behavior; source-order guard. |
| `packages/vercel-deploy-core/src/tests/release-rollback.test.ts` | Already-serving baseline performs no POST/promote request and still reports restored. |
| `scripts/tests/github-ci-policy.test.ts` | Workflow policy fails if the release-owned commit skip is removed or altered. |

### Human-maintained documentation

| File | Documentation updated |
| --- | --- |
| `docs/07-mobile-and-release/release-commands.md` | Pre-mutation Git-status gate, duplicate-release prevention, idempotent rollback. |
| `docs/07-mobile-and-release/deployment-targets.md` | `main`-only Vercel Git deployment policy and ordinary-direct-push vs release-owned-push behavior. |
| `docs/07-mobile-and-release/github-ci-policy.md` | Release-owned commit filtering and `git.deploymentEnabled` contract. |

### Generated documentation

The following files were regenerated, not hand-edited:

- `docs/09-agent-knowledge/generated/catalogs/environment-catalog.md`
- `docs/09-agent-knowledge/generated/graphs/knowledge-graph.json`
- `docs/09-agent-knowledge/generated/reports/env-safety-matrix.md`
- `docs/09-agent-knowledge/generated/reports/graph-health.md`

The generated delta records `scripts/deploy-push.ts` as a consumer of
`GITHUB_REPOSITORY` and increments the corresponding knowledge-graph edge counts.

## Verification evidence

Before commit `739c7c92664b7754b8480d6f4110b65b10bf1cda` was pushed, the local runner
completed all of these successfully:

```text
npx tsx scripts/tests/deploy-push.test.ts
npx tsx packages/vercel-deploy-core/src/tests/release-rollback.test.ts
npx tsx scripts/tests/github-ci-policy.test.ts
npm run typecheck
npm run docs:generate
npm run docs:check
```

The GitHub documentation workflow for the repair commit also completed
successfully on the self-hosted runner (`docs` run `33728619543`). The
`deploy-main` workflow for that same commit was `skipped` (`33728619536`), which
is the expected proof that a `deploy(push):` commit no longer dispatches a second
production release transaction.

After cleanup, both remote branches were aligned to the same repaired commit:

```text
main        739c7c92664b7754b8480d6f4110b65b10bf1cda
integration 739c7c92664b7754b8480d6f4110b65b10bf1cda
```

Temporary runner orchestration files used to apply/verify the repair were not
retained in either branch.

## Remaining external limitation

At the end of the repair, GitHub still reported the Vercel status for the repair
SHA as:

```text
Deployment rate limited — retry in 24 hours.
```

That status is an account/platform limit, not a remaining repository defect. The
new gate ensures future releases stop before changing the six workloads or
`control` when the same immediate rejection is visible. A frontend deployment
can proceed only after the Vercel limit resets or the account limit is changed.

## Operational invariants after this change

These were the invariants as of 2026-09-03. Invariants 1–3 were replaced the
next day by a stricter rule — see the section below.

1. ~~Non-`main` Git pushes must not create Vercel Git deployments for `gova`.~~
2. ~~A `deploy(push):` or `deploy(main):` commit must not launch `deploy:revision`.~~
3. ~~An ordinary direct push to `main` must still dispatch `deploy:revision`.~~
4. A failed/error Vercel commit status must stop publishing before the first
   production runtime mutation.
5. Rollback must be safe when a captured deployment is already Production.
6. Generated knowledge documentation must be regenerated whenever release source
   changes alter environment-key consumers or graph relationships.

## What replaced this design

The 2026-09-03 repair kept two release entrypoints — the local commands and a
GitHub-dispatched `deploy:revision` — and spent its complexity keeping them from
colliding. On 2026-09-04 the second entrypoint was removed instead:

| Then | Now |
| --- | --- |
| `vercel.json` allowed Git deployments on `main` | `git.deploymentEnabled` is `false` for `*` **and** `main`; nothing deploys from Git |
| `.github/workflows/deploy-main.yml` dispatched a release on push | The workflow is deleted; `ALLOWED_WORKFLOW_FILES` in `scripts/github-ci-policy.ts` permits only `docs.yml` and `local-agent-bootstrap.yml` |
| `deploy:revision` deployed an already-pushed SHA | Removed from `package.json`; `gova` is deployed by the transaction's explicit `main:deploy` step |
| `deploy:push` published with selectable targets | Removed; `deploy:push:fast` publishes the complete set, and a bare `deploy:push` is refused |
| Duplicate-release contention was prevented by a commit-prefix skip | There is no second entrypoint to contend with |

Invariants 4–6 survive unchanged: `assertMainGitDeploymentNotRejected` still runs
in `scripts/deploy-push.ts` as a cheap pre-mutation check, rollback is still
idempotent, and generated knowledge is still regenerated with release-source
changes.

`RELEASE_OWNED_COMMIT_PREFIXES` and `deploymentWorkflowViolations()` remain in
`scripts/github-ci-policy.ts`. They are the contract a deployment workflow would
have to satisfy *if one were ever reintroduced*; with no such workflow present
they enforce nothing, and `ALLOWED_WORKFLOW_FILES` is what actually keeps one
from existing.
