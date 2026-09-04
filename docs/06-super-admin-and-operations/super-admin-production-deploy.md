# Super Admin Production Deploy

GitHub pushes do not start production deployments. The machine-only production
deploy endpoint is reserved for authenticated explicit release requests; no
Vercel, repository, archive, email, or notification secret is stored in GitHub.

The terminal sandbox callback delivers the signed in-app notification directly
to the notifications service and sends email independently. Failure messages
include the failed target/account/project, state, provider error code and
message, plus the diagnostic log tail; email retains a longer log tail. Console
polling remains a fallback, so delivery does not require the page to stay open.

## Purpose

`/super-admin/production-deploy` lets the super admin run the full release —
the same `npm run deploy:all` pipeline — from the production web application,
follow it stage by stage, and receive the outcome by in-app notification and by
email.

The release console under `/dev/release-console` stays development-only. This
page is the production surface, and it adds nothing to the pipeline: `deploy:all`
remains the single release gate, unchanged.

The page exposes the same resumable `deploy:all` controls as the CLI: full run,
resume from a runbook branch, re-run one branch, re-run from the earliest stored
failure, and force `smoke:services` to rebuild instead of reusing the
`services:build` output. These options are passed to the sandbox runner and
translated into the normal CLI flags; the browser never receives a secret and
never reimplements release logic.

The selection sent by the page is operator intent, not authority to reuse old
proof. After the persistent Sandbox fetches `main`, the canonical CLI compares
its actual `HEAD` and source fingerprint with `.deploy-all/run-state.json`. A
mismatch, missing state or legacy state expands a continuation to full
validation before applying branch selection. The reason and effective plan are
written to the run log. Same-revision continuations remain branch-precise.

The page also exposes a **Deploy Push** tab. It runs `npm run deploy:push:fast`
in the same Sandbox — the complete transaction: control, the six workloads,
exact-SHA readiness, then `gova`.

It has no target selector. It used to, and the selection did nothing:
`scripts/run-remote-deploy-all.mjs` maps the console's `deploy:push` command to
`deploy:push:fast`, which is pinned to `--vercel-target=all`, and a partial
selection is refused by `scripts/deploy-push.ts` anyway. A control that cannot
change the outcome is a false promise, so it was removed along with the target
vocabulary behind it. To deploy one account for maintenance, run that account's
own `*:deploy` script.

Before its architecture guard, the pipeline regenerates the repository knowledge
snapshots. This keeps a fresh Sandbox clone valid even when a generated catalog
has drifted from the committed source.

## Where the release actually runs

The application never executes a release. It starts one inside a
[Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) that holds a fresh
clone of `main`:

```text
browser (super admin)
  → POST /api/super-admin/production-deploy      (session-authenticated)
    → @asol/vercel-deploy-core/remote-deploy-sandbox
      → sandbox: node scripts/run-remote-deploy-all.mjs
        → npm ci --ignore-scripts, then verify the bundled SQLite binary
        → npm run deploy:all [resume flags selected by the super admin]
      → POST /api/super-admin/production-deploy/callback   (shared secret)
```

The sandbox is persistent and named `asol-gova-deploy-all`, so a reopened
console reattaches to a release already in progress.

The Sandbox image does not provide `make`. Its Node 24-compatible
`better-sqlite3` Linux binary is already bundled with the package, but npm can
otherwise infer an unnecessary `node-gyp` rebuild. The runner therefore skips
install scripts and loads that binary before it starts `deploy:all`.

The sandbox marker also lets the environment doctor disregard only
lockfile-optional artifacts preloaded by the Sandbox image when npm reports
them as extraneous. Missing, invalid, peer-incompatible, and non-optional
extraneous packages still fail preflight.

The Sandbox's npm 11.11 can also report a root dependency override as invalid
despite an exact match with both `package-lock.json` and the declared override.
The doctor accepts only that lockfile-proven Sandbox report; every other invalid
dependency still fails preflight.

Its clone arrives **shallow and detached**, so the checkout builds `main` from
`FETCH_HEAD` rather than an `origin/main` tracking ref that does not exist, and
deepens the history first (`git fetch --unshallow`): GitHub refuses a push from
a shallow clone, and pushing `main` is how the publish phase ships. Deepening
fails on an already-complete repository — the persistent sandbox's second run —
and that failure is expected and ignored.

Because the Sandbox is persistent, a completed release can leave regenerated
service mirrors different from the next fetched `main`. Environment setup uses
a forced checkout of `FETCH_HEAD` to discard only that disposable Sandbox
workspace drift before the new run; `.deploy-all/` remains excluded from the
following cleanup so its state and logs survive.

## Secret handling

- The browser receives **no** deployment credential, ever.
- The only secret the application passes into the sandbox is
  `ASOL_SECRET_ARCHIVE_PASSWORD`, sent as an environment variable of the sandbox
  command. It is never returned in an API response and never written to the log.
- Inside the sandbox, `deploy:all` restores everything else itself from the
  committed encrypted archive (`config/secret-archive-latest.zip.enc`) through
  `ensureReleaseSecretsRestored` → `npm run secrets:restore`.
- The callback is authenticated with `ASOL_DEPLOY_CALLBACK_SECRET` using a
  constant-time comparison, and it can only report — it cannot start anything.

## Run state

The run's state file and log live in the sandbox under `.deploy-all/`
(git-ignored):

| Path | Holds |
|------|-------|
| `.deploy-all/remote-run.json` | the snapshot the console polls |
| `.deploy-all/remote.log` | full output of `npm ci` and `deploy:all` |
| `.deploy-all/remote.lock` | presence marks an owned run |

`GET /api/super-admin/production-deploy` returns `{ snapshot, logTail, readiness }`.
The snapshot also carries `stageHistory` — one span per stage, closed when the
next begins — which is where the console's elapsed time and per-stage durations
come from. They are never timed by the page: a console opened halfway through a
release, or reopened after being closed, must report the same numbers.
Stages follow the pipeline's own phase banners
(`[deploy:all] ── phase: <id> ──`), so the phase list never drifts from
`DEPLOY_ALL_PHASE_ORDER`:

```text
sandbox → dependencies → preflight → publish → notifications → products
  → orders → profiles → submain → sub2main → main → complete
```

## Plan limits

The sandbox is created with a lifetime and a size, and both are capped by the
Vercel plan. A Hobby plan **rejects any timeout above 45 minutes** — the create
call fails with a 400 and the console shows an internal error — so the defaults
are 45 minutes and 2 vCPUs.

A full `deploy:all` (preflight, publish, six service deploys, main
verification) can outlast 45 minutes. When it does, the platform kills the
sandbox mid-release: the runner never sends its callback, and the console marks
the run failed with the reason once it observes that the sandbox outlived its
limit. On a Pro plan raise `ASOL_DEPLOY_SANDBOX_TIMEOUT_MINUTES` (up to a day)
before relying on this page for a full release.

## One release at a time

`startRemoteDeployAll` refuses a second start while a run is `preparing` or
`running` (`productionDeployAlreadyRunning`, HTTP 409). A `preparing` snapshot
older than fifteen minutes is treated as abandoned — the request that created it
runs inside a serverless function that can be cut off before the runner
detaches — and may be replaced. A `running` snapshot is never overridden.

## Notifications

| Channel | Sent by | Once per run because |
|---------|---------|----------------------|
| In-app | the status poll that first observes a terminal run | the snapshot records `inAppNotified` |
| Email | the sandbox callback | the snapshot records `emailStatus` |

The main application cannot push a notification directly; it issues a signed
notification grant that the console's browser delivers to the notifications
service, which is why the in-app message is raised on a poll. The email is sent
from the callback instead, so a release that finishes while nobody is watching
still reaches the release mailbox.

If recording either notification outcome fails, the server records the failure
in its runtime log; the release snapshot remains available for a later retry.

Message text for both channels is built by one pure module,
`src/features/release-commands/domain/production-deploy-report.ts`.

## Server configuration

All of these are Production environment variables of the main `gova` project.
The page lists any that are missing instead of failing silently.

| Variable | Purpose |
|----------|---------|
| `VERCEL_OIDC_TOKEN` | local development only — see below |
| `ASOL_SECRET_ARCHIVE_PASSWORD` | lets `deploy:all` restore its own secrets in the sandbox |
| `ASOL_DEPLOY_CALLBACK_SECRET` | authenticates the runner's terminal callback |
| `ASOL_DEPLOY_NOTIFICATION_EMAIL` | recipient of the result email |
| `PASSWORD_RECOVERY_GMAIL_USER` / `PASSWORD_RECOVERY_GMAIL_APP_PASSWORD` | SMTP sender for that email |
| `ASOL_DEPLOY_REPOSITORY_URL` or `GITHUB_REPOSITORY` | repository the sandbox clones |
| `ASOL_DEPLOY_REPOSITORY_TOKEN` | optional; only needed while the repository is private |
| `ASOL_DEPLOY_CALLBACK_BASE_URL` | optional; overrides the origin used to build the callback URL |
| `ASOL_DEPLOY_SANDBOX_TIMEOUT_MINUTES` | optional; sandbox lifetime, default 45 |
| `ASOL_DEPLOY_SANDBOX_VCPUS` | optional; sandbox size, default 2 |

`npx tsx scripts/push-production-deploy-env.ts` writes every one of these —
except `VERCEL_OIDC_TOKEN` — onto the `gova` project from the local `.env.local`/`.env`, generating
`ASOL_DEPLOY_CALLBACK_SECRET` only when the project does not already have one and
deriving the repository URL from `origin`. It never invents any other value: a
key with no local value is reported and skipped.

`VERCEL_OIDC_TOKEN` is not pushed, ever, and on Vercel it is not an environment
variable at all: with OIDC enabled on the project (`oidcTokenConfig.enabled`),
the token arrives per request as the `x-vercel-oidc-token` header and the
Sandbox SDK reads it from the request context. The readiness check therefore
accepts *either* that variable (local development) or running on Vercel; a
project with OIDC disabled fails at the first Sandbox call with the SDK's own
message rather than being reported as unconfigured.

## Running it from a local dev server

The page works in development, but two things differ and both are properties of
localhost, not of the feature:

- **The callback cannot reach you.** The sandbox POSTs to
  `ASOL_DEPLOY_CALLBACK_BASE_URL` or the request origin, and a sandbox on
  Vercel's network cannot open `http://localhost:3001`. The run is still
  tracked — the console polls the sandbox directly — but the result email is
  only sent if that variable points at a publicly reachable origin.
- **The OIDC token expires.** `VERCEL_OIDC_TOKEN` in `.env.local` lasts about
  twelve hours. Refresh it without clobbering the rest of the file:

```bash
npx vercel env pull .vercel/.env.pull --environment=production --yes
```

Then copy that file's `VERCEL_OIDC_TOKEN` line over the one in `.env.local`.

`ASOL_DEPLOY_CALLBACK_SECRET` and `ASOL_DEPLOY_REPOSITORY_URL` must exist in
`.env.local` too; the local secret is unrelated to the project's, because the
same process both issues and verifies it. Missing keys are what the page's
"إعدادات ناقصة" panel lists, and in development that panel is about `.env.local`,
never about Vercel.

## Files

| File | Responsibility |
|------|----------------|
| `packages/vercel-deploy-core/src/remote-deploy-contracts.ts` | snapshot, stage, and readiness shapes shared by both halves |
| `packages/vercel-deploy-core/src/remote-deploy-sandbox.ts` | create/resume the sandbox, guard concurrency, read state |
| `scripts/run-remote-deploy-all.mjs` | sandbox-side runner: state file, log, deploy option translation, terminal callback |
| `scripts/push-production-deploy-env.ts` | syncs the configuration above to Vercel (run with `npx tsx`; the `deploy:env:push` npm alias was removed) |
| `src/features/release-commands/server/services/production-deploy-service.server.ts` | start, status, callback handling |
| `src/features/release-commands/server/services/production-deploy-email.server.ts` | the result email |
| `src/features/release-commands/presentation/ProductionDeployPage.tsx` | the console page |

## There is no GitHub deploy entry point

`POST /api/super-admin/production-deploy/github` was removed on 2026-09-04,
together with `startGitHubProductionDeploy`, `getGitHubProductionDeployStatus`,
and the `@asol/vercel-deploy-core/github-push-identity` door that authenticated
its OIDC token.

It had already stopped working. Its only caller was
`.github/workflows/deploy-main.yml`, and that workflow was deleted —
`ALLOWED_WORKFLOW_FILES` in `scripts/github-ci-policy.ts` permits only
`docs.yml` and `local-agent-bootstrap.yml`. Its identity check also pinned
`workflow_ref` to that exact deleted path, so no token could satisfy it, and the
`deploy:revision` command it asked the sandbox for is no longer a script in
`package.json`.

An authenticated route that cannot succeed is worse than no route: it reads as a
supported entry point in every inventory that finds it. The statement at the top
of this document is now enforced by the absence of the endpoint, not by policy
alone — GitHub pushes do not start production deployments.

## Safety Boundary

The page is a super-admin surface, not the authorization boundary: both API
routes verify a signed super-admin session server-side, and the callback route
verifies its shared secret. The page may select a `deploy:all` resume branch,
but it cannot select an arbitrary Git branch or revision: the sandbox always
checks out `main`, refreshes it from `FETCH_HEAD`, and then runs the repository
CLI.
