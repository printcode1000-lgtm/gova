# Super Admin Production Deploy

## Purpose

`/super-admin/production-deploy` lets the super admin run the full release —
the same `npm run deploy:all` pipeline — from the production web application,
follow it stage by stage, and receive the outcome by in-app notification and by
email.

The release console under `/dev/release-console` stays development-only. This
page is the production surface, and it adds nothing to the pipeline: `deploy:all`
remains the single release gate, unchanged.

## Where the release actually runs

The application never executes a release. It starts one inside a
[Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) that holds a fresh
clone of `main`:

```text
browser (super admin)
  → POST /api/super-admin/production-deploy      (session-authenticated)
    → @asol/vercel-deploy-core/remote-deploy-sandbox
      → sandbox: node scripts/run-remote-deploy-all.mjs
        → npm ci
        → npm run deploy:all
      → POST /api/super-admin/production-deploy/callback   (shared secret)
```

The sandbox is persistent and named `asol-gova-deploy-all`, so a reopened
console reattaches to a release already in progress.

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
Stages follow the pipeline's own phase banners
(`[deploy:all] ── phase: <id> ──`), so the phase list never drifts from
`DEPLOY_ALL_PHASE_ORDER`:

```text
sandbox → dependencies → preflight → publish → notifications → products
  → orders → profiles → submain → sub2main → main → complete
```

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

Message text for both channels is built by one pure module,
`src/features/release-commands/domain/production-deploy-report.ts`.

## Server configuration

All of these are Production environment variables of the main `gova` project.
The page lists any that are missing instead of failing silently.

| Variable | Purpose |
|----------|---------|
| `VERCEL_OIDC_TOKEN` | authenticates the Sandbox API (injected by Vercel) |
| `ASOL_SECRET_ARCHIVE_PASSWORD` | lets `deploy:all` restore its own secrets in the sandbox |
| `ASOL_DEPLOY_CALLBACK_SECRET` | authenticates the runner's terminal callback |
| `ASOL_DEPLOY_NOTIFICATION_EMAIL` | recipient of the result email |
| `PASSWORD_RECOVERY_GMAIL_USER` / `PASSWORD_RECOVERY_GMAIL_APP_PASSWORD` | SMTP sender for that email |
| `ASOL_DEPLOY_REPOSITORY_URL` or `GITHUB_REPOSITORY` | repository the sandbox clones |
| `ASOL_DEPLOY_REPOSITORY_TOKEN` | optional; only needed while the repository is private |
| `ASOL_DEPLOY_CALLBACK_BASE_URL` | optional; overrides the origin used to build the callback URL |

`npm run deploy:env:push` writes every one of these — except `VERCEL_OIDC_TOKEN` —
onto the `gova` project from the local `.env.local`/`.env`, generating
`ASOL_DEPLOY_CALLBACK_SECRET` only when the project does not already have one and
deriving the repository URL from `origin`. It never invents any other value: a
key with no local value is reported and skipped.

`VERCEL_OIDC_TOKEN` is not pushed, ever. Vercel injects it per request when the
project has OIDC enabled (`oidcTokenConfig.enabled`), and that is what the
Sandbox SDK authenticates with; a copied token would be stale within the hour.

## Files

| File | Responsibility |
|------|----------------|
| `packages/vercel-deploy-core/src/remote-deploy-contracts.ts` | snapshot, stage, and readiness shapes shared by both halves |
| `packages/vercel-deploy-core/src/remote-deploy-sandbox.ts` | create/resume the sandbox, guard concurrency, read state |
| `scripts/run-remote-deploy-all.mjs` | sandbox-side runner: state file, log, terminal callback |
| `scripts/push-production-deploy-env.ts` | `deploy:env:push` — syncs the configuration above to Vercel |
| `src/features/release-commands/server/services/production-deploy-service.server.ts` | start, status, callback handling |
| `src/features/release-commands/server/services/production-deploy-email.server.ts` | the result email |
| `src/features/release-commands/presentation/ProductionDeployPage.tsx` | the console page |

## Safety Boundary

The page is a super-admin surface, not the authorization boundary: both API
routes verify a signed super-admin session server-side, and the callback route
verifies its shared secret. Nothing on this page can select a branch, a phase,
or a revision — the release is always `deploy:all` on `main`.
