# Release Commands

Three commands publish a release — `deploy:all`, `deploy:push` and
`deploy:push:fast`. They differ in which gates run, not in what publishing
means: **every public path runs the same ordered transaction**, defined once in
`scripts/deploy-push.ts` as `runReleaseTransaction`.

| Command | Correctness preflight | Publish gates | Use it when |
| --- | --- | --- | --- |
| `deploy:all` | lint, typecheck, `architecture:check`, tests, DB sync, builds, mirror sync/verify/build, service smoke | all | nothing has been proven yet |
| `deploy:push` | none | all — account access, scratch/manifest/empty refusals, `secrets:backup`, mirror builds | the correctness gates already passed and you want the publish gates anyway |
| `deploy:push:fast` | none | branch, secret restore, credentials only | you just ran the gates yourself and want the shortest publish |

None of them is a substitute for the other two on correctness: only `deploy:all`
runs lint, typecheck and the test suite.

Vercel uploads retry at most three times only for transient transport failures
such as `fetch failed` or connection resets. Build, environment, account, and
readiness failures do not retry; their exact CLI output remains the terminal
release error.

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

That is not hypothetical. A publish whose gova deployment never appeared on
Vercel left `ready` standing, and the topology had to be realigned by hand with
an extra release — see
[main-push-without-vercel-deployment.md](../08-troubleshooting/problems/main-push-without-vercel-deployment.md).

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

## `deploy:push` — publish with the gates, without the preflight

```bash
npm run deploy:push
```

Pinned to `--vercel-target=all`, exactly like the fast command; the only
difference between them is `--fast`. Everything `--fast` skips, this runs before
the first git write:

| Gate | What it refuses |
| --- | --- |
| `assertVercelAccountsForTargets` | a missing or wrong token, before the push rather than after |
| `assertNoScratchFiles` | `*.log`, `*.tmp`, `*.bak`, `scratchpad/` — waived by `--allow-scratch-files` |
| `assertReleaseManifestNotDowngraded` | a lower `releaseId` / `version` / `minimumNativeVersion` — waived by `--allow-manifest-downgrade` |
| `assertSomethingToPush` | an empty deployment — waived by `--allow-empty` |
| `assertServiceMirrorsBuild` | a mirror that does not compile: `services:sync`, `services:build`, `control:build` |

That last one is why this command exists. The root `typecheck` does not cover the
service trees, so a type error inside a mirror is green locally and fails on
Vercel as `Command "npm run build" exited with 1` — after `main` has already
moved. `ActionInput` did exactly that.

`secrets:backup` also runs here, so the encrypted archive matches what was
published; the final line says `secrets backup completed`.

Between 2026-09-04 and the re-enablement, `main()` refused every invocation
without `--fast`. That did not merely hide the command — it made all five gates
above unreachable, `assertServiceMirrorsBuild` included. `scripts/tests/deploy-push.test.ts`
now fails if the disable guard returns, because a guard that disables the only
caller of a safety check deletes the check.

## `deploy:push:fast` — the fast explicit release

```bash
npm run deploy:push:fast
```

The fast path, unchanged. It runs `--fast --vercel-target=all`.
It skips account-access checks, publish refusals, `secrets:backup`, and local
mirror builds. The branch check, secret restore, release credentials, exact-SHA
deployment reports, and `VERCEL_TOKEN` remain mandatory.

Because the backup is skipped, the final line says so — `secrets backup skipped
(--fast)` rather than `secrets backup completed`. A success line naming a step
the run did not perform is how an operator comes to believe an encrypted archive
of the current secrets exists when none was written.

`--allow-scratch-files` and `--allow-manifest-downgrade` have no effect here:
`--fast` returns before the refusals they waive. `--allow-empty` still reaches
the commit. The console's Deploy Push tab offers only that one flag for the same
reason.

The transaction itself is untouched: rollback baseline, control + six + main,
the wait for `READY`, `smoke:deployed`, and automatic rollback on failure. So the
result is still tracked and production still cannot stay broken.

After the GitHub push, the release transaction explicitly deploys Vercel only
after its control and workload prerequisites are READY. There is no GitHub-side
Vercel deployment or second-machine release path to race with that transaction.

Two guards are not optional under `--fast`:

- **`main` only.** A partial `--vercel-target=` is refused outright. It used to
  divert to a maintenance deploy that wrote no git and therefore never checked
  the branch — the one way a publish could have reached Vercel from another
  branch. That path was removed on 2026-09-04: to deploy one account for
  maintenance, run that account's own `*:deploy` script.
- **`HEAD` is advanced to `origin/main` before the commit.** The run fetches and
  fast-forwards, so the deployment commit is written on top of the remote rather
  than beside it. Only a fast-forward is automatic: `--ff-only` leaves the
  uncommitted tree intact and stops if an incoming change would overwrite a
  modified file, and a diverged local `main` is refused for the operator to
  reconcile — a rebase over an uncommitted tree is how work disappears.

The uncommitted tree is the point, not an accident: `git add -A` stages every
modified and untracked file, so anything not yet on GitHub is published by the
same commit.

The trade is intentional: a mirror error can surface only during the remote
release after `main` has moved. Use this command only after the local gates have
already passed — `deploy:push` is the same publish with those gates included.
There is still no public partial-target or revision command.

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

The release uploader generates `.tmp-gova-build/` — a deterministic copy of the
repository with the Business API route trees left out — then uploads that view
as Vercel's project root. It marks the upload with `ASOL_GOVA_UPLOAD_VIEW=1`, so
`build:vercel` builds the already-uploaded root and writes `.next` there.

The view replaces the application backend `instrumentation.ts` with an empty
frontend entrypoint and skips the application's global Drizzle trace inclusion.
Next traces conditional imports, so both protections are required to prevent
database drivers from reaching a frontend artifact that has no database
capability. Its `vercel.json` sets `outputDirectory` to `.next`.

This failure could only appear once a SHA actually crossed the readiness
barrier; every earlier attempt failed before the gova build was allowed to
publish, which is why it surfaced late.

Two commands own that view:

```bash
npm run gova:tree         # generate .tmp-gova-build/
npm run gova:tree:check   # verify the classification, without reading the copy
```

`--check` is the drift gate, and it deliberately does **not** compare a
previously written tree. The view is deterministic, so the question worth asking
is not "does the copy match" but "does the classification still hold". It
cross-checks the manifest against the canonical ownership registry in
`@asol/account-bridge/routes`: every route gova omits must have an owner that
will answer it, and every route gova keeps must be one no other runtime owns. A
business route added without an owner fails here rather than shipping as a 404
behind the compatibility boundary.

**Delete the view after a local release.** `.tmp-gova-build/` is gitignored and
disposable, but nothing removes it — not the uploader, not `deploy:all`. Left in
place it is an unauthorized top-level source directory, and the Repository Sweep
in `npm run architecture:check` fails on it:

```text
Unauthorized top-level source directory ".tmp-gova-build" contains N script file(s).
```

Every other reported violation then comes from files copied inside it, not from
repository source. Remove the directory and re-run the check:

```bash
rm -rf .tmp-gova-build
```

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
