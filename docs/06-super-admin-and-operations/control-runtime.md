# The control runtime

Super Admin operations run in their own Vercel deployment, `asol-control`, and
not in the application. This document is what that runtime is, what it owns, and
how a release uses it.

## Why it is separate

The Super Admin console can deploy production, read every system log, administer
OTA releases, purge orders, and restore database backups. While those routes
lived in `gova`, the GitHub-linked project that was automatically redeployed on every push, the
deployment serving the storefront also held the session signing secret, the
deployment credentials for seven other accounts, and write access to every
database. A frontend does not need any of that, and an account that holds a
credential it cannot use is an account that can leak one.

So `gova` became a frontend and `control` became the operational runtime. The two
are separate deployments with separate credentials, and neither can reach the
other's.

## What control owns

Ownership is declared once, in `@asol/account-bridge/routes`, and every runtime
reads it from there — the client bridge when it addresses a call, gova's
compatibility boundary when it redirects one, and the build view when it decides
what to compile.

| Pattern | Methods |
|---|---|
| `/api/super-admin/**` | all |
| `/api/system-logs/**` | all |
| `/api/ota/admin/**` | all |

That is 55 route modules: build jobs and their artifacts and analyses, data
health, dev cloud backup, Google Play console and store assets, production
deploy, user administration and impersonation, the System Logs family including
its authenticated SSE stream, and OTA administration.

Control also serves two operational routes that belong to no business owner:
`/api/health` and `/api/release-readiness/[revision]`.

## The release readiness barrier

`GET /api/release-readiness/<40-character SHA>` answers exactly one of
`pending`, `ready`, or `failed`, and nothing else.

It is the one control surface a release pipeline polls without a Super Admin
session, so it is deliberately blind: no logs, no stage, no sandbox name, no
error text, no configuration. Its source of truth is the control-owned
`control_release_state` table in the system-ops shard, written only by the
authorized release callback or bootstrap release path. The Vercel Sandbox may
disappear after a run; readiness survives because the barrier never reads the
Sandbox filesystem.

`ready` is derived, not written by trust. The durable row must name the exact
40-character revision, a passed control result, passed results for
notifications, products, orders, profiles, submain and sub2main, passed smoke
evidence for the same revision, timestamps, and no persisted rollback success.
Targeted workload deploys and stale SHAs can update their own evidence, but they
cannot satisfy a full-release row for another revision. Duplicate callbacks are
idempotent through their operation id, and version conflicts fail closed rather
than overwriting newer state.

Two public-read rules follow from that:

- A revision the runtime has no record of is `pending`, not `failed`. The
  pipeline may be asking before the deploy started, and `failed` would abort a
  release that had not begun.
- An internal error also answers `pending`. A reason here would be an
  unauthenticated window into the runtime's configuration.

A short SHA is refused with `400`. A barrier that guessed which commit you meant
would be worse than one that is down.

`deploy:all` publishes this row only after the irreversible release has deployed
and observed `READY` for control and all six workloads. The explicit gova
deployment waits on this row before it generates the gova-only build view, so the
frontend can never publish ahead of the runtimes it redirects to.

## The error contract is shared, not restated

Control answers the same status and the same body the application answered for
the same failure. This is not a convention — it is a shared module,
`src/core/api/business-api-error-status.ts`, that both `mapServiceError` and
every control seam call.

It exists because the two had already drifted while they were written by hand:
`forbidden` was `403` in the application and `401` in control, and an
unrecognised error was `500 internalServerError` in one and `400` in the other. A
client moved to a new origin that maps the same failure to a different status is
a broken client, and nothing else would have caught it — both runtimes were
internally consistent and disagreed with each other.

Two per-family exceptions remain, and both match the application exactly:

- **System Logs** answers `401` for a missing or expired session, because its
  console has to tell "sign in again" from "that query was wrong".
- **The GitHub OIDC deploy entry point** reports a rejected push identity as
  `forbidden` with `401`, so a misconfigured workflow reads as "authenticate"
  rather than "you are the wrong user".

`scripts/tests/control-service.test.ts` asserts every control error seam goes
through the shared mapping, and scans for hardcoded statuses allowing only those
two.

## Commands

| Command | What it does |
|---|---|
| `npm run control:sync` | Mirrors the shared source graph into `services/control/generated/` |
| `npm run control:verify` | Sync, typecheck, and the control contract test |
| `npm run control:build` | Sync, then `next build` inside the service |
| `npm run control:smoke` | Builds, starts, and asks six real questions |
| `npm run control:deploy` | Deploys the control account |
| `npm run test:control` | The contract test alone |

`control:smoke` deliberately does not stop at health. The outage the service
smoke gates exist for left `/api/health` at `200` while every data route answered
`500`, because no composition root had registered the ports. Control's equivalent
is authorization: an unauthenticated request that comes back `400
sessionTokenInvalid` proves the handler ran and its identity ports were
registered, where a `500` or a `404` would not. The smoke also asserts the
readiness barrier's body carries no key beyond `revision` and `status`.

## Rollback

Before the first production mutation, a release captures the deployment id each
project is currently serving. If anything fails after that point, the
compensation is mechanical and automatic — it does not pause for instructions,
because a half-applied topology (three workloads on the new revision, three on
the old, and a frontend redirecting to both) is worse than either end state, and
nobody is watching at the moment it happens.

`@asol/vercel-deploy-core/release-rollback` re-promotes each project to the exact
deployment it was serving. It promotes rather than redeploys — a rebuild could
fail for the same reason the release did — and it never stops at the first
failure, because a rollback that aborts halfway leaves the mixed topology it
exists to prevent. A project that had no production deployment when the baseline
was taken is skipped, which is the normal case for `asol-control` on the release
that creates it.

The report is names-only and safe to print from a release log.

## Environment

Control declares only what its route graph proves it needs, and the hosted guard
validates one runtime at a time. `npm run env:ownership` prints a names-only
report for the current runtime — what it requires, what is missing, and any
secret name present that it does not declare, grouped by family. It exits
non-zero on a foreign *deployment* credential, which is the one finding that is
never a false positive: a project that can deploy another account is not isolated
from it.

No value is ever read or printed.
