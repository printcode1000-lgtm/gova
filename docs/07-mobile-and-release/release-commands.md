# Release Commands

Only `deploy:all` and `deploy:push:fast` publish a release. They differ in
which gates run, not in what publishing means: **every public path runs the
same ordered transaction**, defined once in
`scripts/deploy-push.ts` as `runReleaseTransaction`.

For the account/project topology those commands act on, see
[deployment-targets.md](./deployment-targets.md). For the consolidated incident, repair,
file-level change list, verification evidence, and remaining external Vercel limit, see the
[2026-09-03 release orchestration hardening record](./release-orchestration-hardening-2026-09-03.md). For resuming a failed
`deploy:all`, see
[deploy-all-resume-and-checkpoints.md](./deploy-all-resume-and-checkpoints.md).

## The release transaction

```text
1. capture rollback baseline   gova, control, and the six workloads
2. deploy the six workloads    notifications, products, orders, profiles, submain, sub2main
3. deploy control              its own mandatory step, same SHA, never a seventh workload
4. publish exact-SHA readiness POST to control's production-deploy callback
5. deploy main                 explicitly deploy gova for that SHA and wait for READY
   on any failure              re-promote the captured baseline automatically
```

### Why the order is the contract

**Readiness gates the frontend.** `build:vercel` — the Vercel build command for
the explicitly deployed `gova` project — waits for the release state of its exact
release revision to become `ready` *before* it produces a publishable
artifact. A `failed` state or a timeout fails the build closed, leaving the
previous gova production deployment serving. So step 4 is the only thing that
lets a frontend publish, and it must not run until steps 2 and 3 are READY.

**Main is verified last, never concurrently.** Steps 2–3 and step 5 previously
ran under one `Promise.allSettled`, which verified the gova deployment while
backends were still deploying. Under the barrier that ordering cannot work: main
cannot become READY until readiness is published, and readiness cannot be
published until the backends are done.

**A failed release withdraws its readiness.** Readiness is the only thing that
unblocks the gova build, so leaving it `ready` for a revision whose release then
failed lets a late frontend build publish over backends the rollback has already
reverted — a frontend on one SHA above backends on another, the one state the
barrier exists to prevent. The transaction marks the revision `failed` before it
rolls anything back, which makes `build:vercel` fail closed for that SHA forever.

That is not hypothetical. A `deploy:push` whose gova deployment never appeared on
Vercel left `ready` standing, and the topology had to be realigned by hand with
an extra release.

The retraction needed two halves, and the first one alone was worthless. Sending
the failure to the callback logged "readiness withdrawn" while the barrier kept
answering `ready`: the durable status was *derived* from the components, and all
of them had passed, so a derived `ready` came straight back. An explicit failure
now outranks a derived readiness and is permanent for that revision — a later
passing component cannot revive it. `test:vercel-deploy-core` asserts both, by
reading the barrier back rather than trusting the write.

**The baseline is captured before the first mutation.** A failure after step 2
has already changed production. Capturing names and deployment ids up front is
what lets the failure path re-promote the previous deployments automatically
instead of stopping for a human decision. Rollback is idempotent: if a captured
deployment is still the production deployment (for example, `gova` never moved
because Git deployment was rejected), it is treated as already restored instead
of calling Vercel's promote endpoint and turning the harmless no-op into a `409`.

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

## `deploy:revision` — controlled maintenance path

```bash
npm run deploy:revision -- --revision=<40-character-sha>
```

This command is reserved for controlled maintenance at an already-pushed SHA.
An ordinary push to `main` never invokes it or deploys any Vercel project.

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

Flags: `--allow-empty`, `--allow-manifest-downgrade`, `--allow-scratch-files`,
`--fast`.

### `deploy:push:fast` — the commit, the push, and the Vercel wait

```bash
npm run deploy:push:fast
```

`--fast --vercel-target=all`. Everything between the commit and Vercel is
dropped: the Vercel token round trip, the scratch-file, manifest-downgrade and
non-empty refusals, `secrets:backup`, and the mirror builds below. What survives
is only what costs nothing and cannot be recovered from afterwards — the branch
check, the restore of absent release credentials (a no-op when they are present),
and `VERCEL_TOKEN`, without which the run cannot deploy at all.

The transaction itself is untouched: rollback baseline, control + six + main,
the wait for `READY`, `smoke:deployed`, and automatic rollback on failure. So the
result is still tracked and production still cannot stay broken.

After the GitHub push, the release transaction explicitly deploys Vercel only
after its control and workload prerequisites are READY. There is no GitHub-side
Vercel deployment or second-machine release path to race with that transaction.

Two guards are not optional under `--fast`:

- **`main` only.** A partial `--vercel-target=` is refused outright. That path is
  a maintenance deploy, it writes no git and therefore never checks the branch —
  the one way a publish flag could have reached Vercel from another branch.
- **`HEAD` is advanced to `origin/main` before the commit.** The run fetches and
  fast-forwards, so the deployment commit is written on top of the remote rather
  than beside it. Only a fast-forward is automatic: `--ff-only` leaves the
  uncommitted tree intact and stops if an incoming change would overwrite a
  modified file, and a diverged local `main` is refused for the operator to
  reconcile — a rebase over an uncommitted tree is how work disappears.

The uncommitted tree is the point, not an accident: `git add -A` stages every
modified and untracked file, so anything not yet on GitHub is published by the
same commit.

The trade is the mirror builds. `--fast` moves a mirror type error from two
minutes locally to a failed publish cycle after `main` has already moved. Use it
when the correctness gates have just run — which is what `deploy:push` assumes of
its caller anyway.

**It does prove the mirrors build.** `services:sync`, `services:build` and
`control:build` run before the push. That is not a correctness gate sneaking
back in — the root `typecheck` covers `src/` and the packages but not the
service trees, so a type error inside a mirror is invisible locally and surfaces
as `Command "npm run build" exited with 1` on Vercel, after `main` has already
moved. Syncing first matters for the same reason: a mirror built from stale
sources proves nothing about the sources being pushed.

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
| `VERCEL_TOKEN` | the publishing host | Explicitly deploys and verifies the main project. |
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
| `smoke:owned-reads` | **every** owned GET route on every account, against production. A `4xx` passes — the handler ran and refused; a `5xx`, or an unconfigured-port body behind a `200`, fails. Runs as part of `smoke:deployed`. |
| `test:service-cors` | every deployment installs the shared CORS boundary (`createServiceProxy`) at `/api/:path*`, and a preflight for a path **no route implements** answers with a real `Access-Control-Allow-Origin`, `DELETE` among the allowed methods, and the shared `BROWSER_REQUEST_HEADERS`. A bare `204` fails: without the header the browser never sends the request, and the caller sees a network outage from a healthy server. Runs inside `test:deployment-tools`. |
| `test:route-ownership` | every owned route+method is shipped by its owner, and the known-unshipped backlog only shrinks |
| `test:mirror-status-parity` | a canonical route that maps statuses itself is never mirrored by one using only a generic responder |
