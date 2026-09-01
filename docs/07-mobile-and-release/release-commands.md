# Release Commands

Three commands publish a release, and one deploys a single account for
maintenance. They differ in which gates run, not in what publishing means:
**every path that publishes runs the same ordered transaction**, defined once in
`scripts/deploy-push.ts` as `runReleaseTransaction`.

For the account/project topology those commands act on, see
[deployment-targets.md](./deployment-targets.md). For resuming a failed
`deploy:all`, see
[deploy-all-resume-and-checkpoints.md](./deploy-all-resume-and-checkpoints.md).

## The release transaction

```text
1. capture rollback baseline   gova, control, and the six workloads
2. deploy the six workloads    notifications, products, orders, profiles, submain, sub2main
3. deploy control              its own mandatory step, same SHA, never a seventh workload
4. publish exact-SHA readiness POST to control's production-deploy callback
5. verify main                 wait for the GitHub-linked gova deployment of that SHA
   on any failure              re-promote the captured baseline automatically
```

### Why the order is the contract

**Readiness gates the frontend.** `build:vercel` — the Vercel build command for
the GitHub-linked `gova` project — waits for the release state of its exact
`VERCEL_GIT_COMMIT_SHA` to become `ready` *before* it produces a publishable
artifact. A `failed` state or a timeout fails the build closed, leaving the
previous gova production deployment serving. So step 4 is the only thing that
lets a frontend publish, and it must not run until steps 2 and 3 are READY.

**Main is verified last, never concurrently.** Steps 2–3 and step 5 previously
ran under one `Promise.allSettled`, which verified the gova deployment while
backends were still deploying. Under the barrier that ordering cannot work: main
cannot become READY until readiness is published, and readiness cannot be
published until the backends are done.

**The baseline is captured before the first mutation.** A failure after step 2
has already changed production. Capturing names and deployment ids up front is
what lets the failure path re-promote the previous deployments automatically
instead of stopping for a human decision.

**Control is deployed, never "updated later".** Control is deliberately absent
from `SERVICE_PHASE_IDS` and `ALL_DEPLOY_PUSH_TARGETS` — it holds deployment
authority over those accounts, and a loop that treats it as one of them can
redeploy the runtime performing the deploy. Absent from the workload arrays must
not mean absent from the release, so it gets its own mandatory step at the same
SHA.

## `deploy:all` — the full release gate

```bash
npm run deploy:all
```

Runs the complete preflight runbook (lint, typecheck, `architecture:check`, the
test suite, database schema sync, the main build, the static build, service
mirror sync/verify/build, and service smoke) **before the first git write**,
then publishes through the transaction as its own phases:

```text
preflight → publish → control → notifications → products → orders → profiles
          → submain → sub2main → readiness → main
```

`--skip-preflight` publishes without the gates. `--phase`, `--from-phase`,
`--rerun-branch`, `--from-branch`, and `--rerun-failed` resume a failed run.

### The deployment commit and protected documentation

The publish phase stages the tree and creates `deploy(main): <timestamp>`. When
any staged path is classified `protected` by
[document-mutability.md](../09-agent-knowledge/document-mutability.md), the
commit gets a second message line carrying `[docs-contract-change]`, naming the
paths. The marker is stamped from what is actually staged — never
unconditionally, because it is a repository-wide authorization switch and
switching it on for every deployment would make it meaningless.

Without this the documentation gate denies the very commit the command just
staged, and no release carrying a contract change could ever be committed.

### Rollback resets the deployment phases

When a phase fails after the push, `deploy:all` re-promotes the captured
baseline and then **forgets every deployment phase it had recorded as complete**
(`forgetRolledBackDeploymentPhases`), and clears the branch checkpoints.
Preflight and publish survive — the commit is still pushed and the gates still
passed, and neither is undone by promoting an older deployment.

This is not bookkeeping. A rollback undoes the deployments the run recorded, so
leaving those checkpoints in place makes the next resume skip the deployments
that were just reverted and then fail with no deployment report — the release
becomes unretryable without deleting state by hand.

## `deploy:revision` — the GitHub push path

```bash
npm run deploy:revision -- --revision=<40-character-sha>
```

Not run by hand. Every push to `main` reaches control's machine-only
`/api/super-admin/production-deploy/github` endpoint over GitHub OIDC, and
control starts this command inside the persistent Vercel Sandbox, pinned to the
token's SHA.

It requires a clean checkout at that exact full SHA, never stages, commits, or
pushes, and runs the transaction unchanged. It runs no gates: correctness is
proven locally and by `deploy:all`, and the Vercel build is release coordination
rather than CI.

## `deploy:push` — publish without the gates

```bash
npm run deploy:push
```

Commits the working tree, pushes `main`, verifies the push reached GitHub, and
runs the same transaction. Use it when the gates have already passed and you do
not want to pay for them again; `deploy:all -- --skip-preflight` is the
equivalent with the runbook's resume machinery.

Flags: `--allow-empty`, `--allow-manifest-downgrade`, `--allow-scratch-files`.

### Targeted maintenance deploys

`--vercel-target=` selects accounts. A selection that is **not** the complete
set of six diverts — before any git write — to a maintenance deploy: it deploys
the named accounts from the current `HEAD` and stops. No commit, no push, no
readiness.

The rule exists because publishing is all-or-nothing under the barrier. A push
starts the gova build; the build then waits for a readiness that a partial
deploy is forbidden to mark, and fails closed when the wait times out. Before
this rule `--vercel-target=none` pushed `main` and deployed nothing, which
guaranteed exactly that outcome.

```bash
npm run deploy:push -- --vercel-target=products   # maintenance: deploys products only
npm run deploy:push                               # release: control + six + main
```

Only the complete control + six workload proof may release the gova build
barrier.

## Deployment prerequisites

| Value | Needed by | Why |
| --- | --- | --- |
| `ASOL_DEPLOY_CALLBACK_SECRET` | the publishing host **and** the `asol-control` project | Authenticates the readiness/terminal callback. Both sides compare the same value; without it on control the callback answers `503 productionDeployNotConfigured`, and without it locally the release fails before publishing readiness. |
| `NEXT_PUBLIC_ASOL_CONTROL_URL` | the publishing host and the `gova` project | Where readiness is published, and where `build:vercel` polls for it. |
| `VERCEL_TOKEN` + `.vercel/project.json` | the publishing host | Identifies and verifies the GitHub-linked main project. |
| each account's `VERCEL_*_TOKEN` | the publishing host | Deploys that account and captures its rollback baseline. |

Public origins (`NEXT_PUBLIC_ASOL_*_URL` for control and the six workloads) must
resolve for every declared runtime; a missing one fails `deploy:all` in
preflight, before any mutation.

## Deploying an account: two failure modes worth knowing

**A stale `.vercel/project.json` beats `VERCEL_PROJECT_ID`.** The Vercel CLI
reads the on-disk link first, so a service directory linked once to another
project keeps deploying there regardless of the declaration. A control release
reached a project named `control` while the declaration, the workflow endpoint,
and the production alias all named `asol-control`. `runVercel` now discards a
link whose `projectId` does not match the resolved project; the link is local,
gitignored state, so it is dropped rather than repaired.

**`ensureProject` set the framework preset only when creating.** A project
created by hand keeps `framework: null`, and Vercel then treats a successful
`next build` as a static build, looks for a `public` directory a service never
produces, and fails the deployment *after* the build passed. Existing projects
are now converged onto `nextjs` on every deploy.

## The gova build view and Vercel's output directory

`build:vercel` generates `.tmp-gova-build/` — a deterministic copy of the
repository with the Business API route trees left out — and runs `next build`
**inside it**. The artifact therefore lands in `.tmp-gova-build/.next`, while
Vercel's Next.js builder looks for `.next` at the project root.

`vercel.json` sets `outputDirectory` to `.tmp-gova-build/.next` for exactly this
reason. Without it a deployment fails with `NEXT_NO_ROUTES_MANIFEST` *after* a
build that succeeded and passed every artifact scan — the isolation worked, the
output was simply somewhere Vercel does not read. `vercel-deployment-guards.test.ts`
pins the value against `GOVA_DEPLOYMENT_DIR` so the two cannot drift.

This failure could only appear once a SHA actually crossed the readiness
barrier; every earlier attempt failed before the gova build was allowed to
publish, which is why it surfaced late.

## Verification

A deployment reporting `READY` means the deployment exists, not that a request
succeeds. Every runtime's smoke must ask it a question that reaches its own
storage — see
[every-server-route-500-unregistered-port.md](../08-troubleshooting/problems/every-server-route-500-unregistered-port.md)
for what happens when it does not.

| Gate | Asks |
| --- | --- |
| `smoke:services` | one route per workload that reaches that account's own data |
| `control:smoke` | control's auth boundary, plus a release-barrier read of its own shard, plus a scan of the server log for unregistered ports |
| `smoke:deployed` | the deployed origins: gova health, a legacy `307` redirect that must not be followed, control's auth boundary, and each workload's data route |
