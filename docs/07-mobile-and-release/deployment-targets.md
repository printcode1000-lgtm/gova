> **Note:** Operational detail relocated here during the 2026-08 architecture reconstruction. Architectural relationships: [docs/01-architecture/](../01-architecture/README.md).

# Deployment Targets

| Target | Command | API | Database |
|--------|---------|-----|----------|
| Local development | `npm run dev` | Same origin `/api/*` | SQLite |
| Hosted backend | Local `npm run build` (correctness) then deploy. Vercel GitHub builds use `npm run build:vercel` | Same origin or remote | Turso |
| Static export (GitHub Pages) | `npm run build:static` | Remote via `ASOL_API_BASE_URL` | None (SPA only) |
| Capacitor (Android / iOS) | `npm run cap:build` | Baked API URL | None (shell over `out/`) |
| Notifications service | `npm run notifications:deploy` | Own origin, `/api/notifications/send` | Notifications Turso only |
| Products service | `npm run products:deploy` | Own origin, product read APIs | Product Turso only |
| Orders service | `npm run orders:deploy` | Own origin, `GET /api/orders` | Order shards only |
| Profiles service | `npm run profiles:deploy` | Own origin, profile read APIs | Profile shards only |
| Secondary full app | `npm run submain:deploy` | Same routes as main app | Same Turso/R2 runtime as `gova` |
| Third full app | `npm run sub2main:deploy` | Same routes as main app | Same Turso/R2 runtime as `gova` |

The first four share **identical application code** — only environment
configuration changes.

## Eight Vercel runtimes

`gova` is the only GitHub-linked project. It serves the frontend, static assets,
`/.well-known/**`, `/api/health`, and the stateless compatibility redirect
boundary — it carries no Business API implementation, no business database or
storage execution, and no business secret. `control` is the operational control
runtime; the six workloads stay exactly six and `control` is never one of them.

Normal product traffic crosses browser-to-owner directly. The sole
server-to-server exception is the terminal production-deploy callback: it may
POST an already signed, single-use notification grant to the notifications
service so the super-admin result does not depend on an open browser.

| | Main app | Control | Submain app | Sub2main app | Notifications | Products | Orders | Profiles |
|---|---|---|---|---|---|---|---|---|
| Vercel project | `gova` | `asol-control` | `asol-submain` | `asol-sub2main` | `asol-notifications` | `asol-products` | `asol-orders` | `asol-profiles` |
| GitHub | connected, but Git deployments are disabled for every branch | **not connected** | **not connected** | **not connected** | **not connected** | **not connected** | **not connected** | **not connected** |
| Updated by | explicit release command (`deploy:all` or `deploy:push:fast`) | `npm run control:deploy` | `npm run submain:deploy` | `npm run sub2main:deploy` | `npm run notifications:deploy` | `npm run products:deploy` | `npm run orders:deploy` | `npm run profiles:deploy` |
| Uploaded files | the gova deployment view | `services/control/` | the repository | the repository | `services/notifications/` | `services/products/` | `services/orders/` | `services/profiles/` |
| Serves | frontend, `/api/health`, legacy `307` redirects | Super Admin operations, System Logs, OTA administration, release/readiness | isolated full-app staging | isolated full-app staging | push fan-out only | product reads only | the order list only | five profile reads |
| Turso account | none | `hesham101` primary + system-ops shard | same runtime env as `gova` | same runtime env as `gova` | `hesham102` | `hesham103` | `hesham104` | `hesham105` |

The connectors are driven by sealed capability packages under `packages/`: `@asol/vercel-deploy-core`, `@asol/service-mirror-core`, `@asol/account-bridge`, `@asol/control-composition`, `@asol/notifications-composition`, `@asol/products-composition`, `@asol/orders-composition`, `@asol/profiles-composition`, `@asol/submain-composition`, and `@asol/sub2main-composition`. See [26-cloud-accounts.md](../06-super-admin-and-operations/cloud-accounts-architecture.md), [Notification Bridge Module](../05-platform-features/notification-bridge-module.md), and [Service Bridge Module](../05-platform-features/service-bridge-module.md).

Keep the main project's GitHub connection as it is. The deploy command runs the
CLI with `services/notifications` as its working directory, so it writes that
folder's `.vercel`, never the repository root's link.

## Vercel hosted builds vs local correctness

The GitHub-linked main Vercel project does **not** run the local correctness
gate. `vercel.json` `buildCommand` is `npm run build:vercel`
(`scripts/vercel-deployment-build.ts`): Deployment/Smoke Guards only — hosted
Node engines, the authoritative database/runtime and baked remote-origin **key
names**, `next build`, required Next server manifests/root route trace, and
`vercel:function-size:check`. It does not run `architecture:check`, lint,
typecheck, generated test gates, or database ensure/schema sync.

Local `npm run build` remains the correctness gate (`scripts/run-generated-gate.ts build`).
Do not point Vercel at `npm run build`. Isolated `services/*` projects keep
`next build` only. The hosted guard never invents missing URLs or credentials.
Separately, `smoke:deployed` requires explicit origins for all eight deployment
targets (`gova`, `control`, and the six workloads); a missing origin is an environment-evidence gap rather than a reason
to omit that target or make it a requirement of the main hosted build.

## One-command production deployment

GitHub Actions is not a correctness or deployment gate. An ordinary direct `git push origin main`
never deploys any Vercel project. The explicit release commands own the only
production transaction. In order, it
captures the production rollback baseline for `gova`, `control`, and the six
workloads; deploys the six isolated projects; deploys `control` at the same SHA
through its own mandatory step; publishes durable exact-SHA release readiness to
the control plane; and only then explicitly deploys the main project. The
gova build is started explicitly only after that readiness is published, so main
is never deployed against unfinished backends and a failed release leaves the previous
gova production deployment active. Any
failure rolls back to the captured baseline automatically. The terminal callback
then sends the super-admin push notification and email. A docs
change additionally runs the path-filtered docs workflow. See
[github-ci-policy.md](./github-ci-policy.md).

Three commands push `main` to production from a local `main` working tree:

```bash
npm run deploy:all        # full preflight, then publish
npm run deploy:push       # publish gates only — no lint/typecheck/tests
npm run deploy:push:fast  # explicit fast publish after local verification
```

All three publish through that same ordered transaction and explicitly deploy the
gova project after release readiness. No other public deployment command is
supported, and each is pinned to the complete set: only the complete control +
six workload proof may release the gova build barrier.

[release-commands.md](./release-commands.md) is the reference for all three
commands, the transaction's ordering contract, the deployment commit's
`[docs-contract-change]` stamping, and the deployment prerequisites.

### `deploy:all` — full release gate

`scripts/deploy-all.ts` runs from a visible runbook: phase → section → branch →
one command. The top-level phase order stays:

```text
preflight → publish → notifications → products → orders → profiles → submain → sub2main → main
```

`--list-phases` prints both that phase order and the nested runbook. The shape is
intentional: a failing branch names exactly one command or operation to inspect
and retry.

The **preflight** phase runs before the first git write, because the push is what
makes a release public and nothing after it may be the first place a problem is
discovered. Its sections are:

| Section | Branches |
| :-- | :-- |
| environment and Vercel accounts | `doctor:environment:production`, `vercel:accounts:check` |
| source quality and architecture | `lint`, `typecheck`, `architecture:check`, `test` |
| database and runtime contracts | `db:ensure`, `db:schema:sync:release` |
| main app builds | `build`, `build:static` |
| isolated service deployments | `services:sync`, `services:verify`, `services:build` |

The **publish** phase is also split into sections:

| Section | Branches |
| :-- | :-- |
| local guards before staging | main-branch check, deployment credentials, scratch-file refusal, release-manifest downgrade refusal, non-empty deployment refusal |
| secret archive | `secrets:backup` |
| Git revision | clear stale index lock, `git add -A`, deployment commit, clean-tree verification, push `main` |

The six isolated Vercel phases each contain one deploy branch:
`notifications:deploy`, `products:deploy`, `orders:deploy`, `profiles:deploy`,
`submain:deploy`, and `sub2main:deploy`. The final `main` phase contains three
branches: `main-ready` (match commit SHA and wait for `READY`), `main-serving`
(`release:check` — production serves this build), and `deployed-smoke`
(`smoke:deployed` — the eight deployed origins answer their data routes).

   `services:build` was added after every other check in this list passed, the
   release commit was pushed, `main` went `READY`, and **the isolated service
   accounts then failed their remote build**. Each service is uploaded alone and
   installed against its own `package.json`, so nothing that runs at the
   repository root exercises it. It is the only step here that builds what
   Vercel builds.

   `services:verify` sits immediately before it and covers the gap `services:build`
   cannot. The shared code now lives in sealed packages, so what each service
   uploads is decided by a graph walker rather than by a folder, and a specifier
   the walker cannot see is simply never copied. Nothing downstream notices: the
   remote build resolves lazily and succeeds, and the failure lands on the first
   request as `Cannot find module`. It happened — when `@asol/data-core` became an
   ES module its lazy driver loads changed from `require(...)` to a `createRequire`
   handle, the walker's pattern stopped matching, and **every database driver
   dropped out of all four mirrors while all four still built**. The step re-reads
   each upload and resolves every edge inside it: relative paths, `@/` paths, and
   `@asol/<package>/<door>` through the mirrored package's own `exports` map;
6. refuses to publish scratch files (`__probe*`, `*.log`, `*.tmp`, `*.bak`,
   scratchpad paths), since `git add -A` stages whatever is in the tree;
   `packages/native-core/android/build/` is gitignored so local Gradle output
   never enters a deployment commit;
7. refuses a downgrade of `releaseId`, `version`, or `minimumNativeVersion` in
   `public/asol-web-manifest.json` — what a verification-only `build:static`
   produces when the release environment variables are unset;
8. refuses an empty run whose `HEAD` already matches `origin/main`.

Before creating a deployment commit it fetches `origin/main` again. If `main`
advanced while the long preflight ran, the run stops without staging or
committing; restart the full release so the newer tree is checked too. Only
then does it create or verify the encrypted secret backup, stage the
complete working tree, and create a main deployment commit named
`deploy(main): <ISO timestamp>`. It pushes `main` to GitHub without starting a
Vercel deployment. The release's explicit main phase deploys Gova. The six isolated Vercel deployments
and main verification then start together; the command waits for their combined
report and prints every result, including failures. If the configured GitHub credential
is needed, the retry temporarily updates the local Git remote and still runs
`git push origin main`; no token-bearing URL is passed as a command argument or
printed in the failure output.
existing GitHub integration update `gova`. The other six projects remain
disconnected from GitHub and deploy sequentially through their dedicated
tokens. Each account receives its own visible comment, for example
`deploy(products): <timestamp> @ <revision>`, plus target/run/revision metadata.
This avoids ambiguous CLI deployments and concurrent downloads sharing one npm
cache.

### Function size

Vercel rejects a serverless function over 250MB uncompressed, and the rejection
lands *after* a successful build, reported as
`BUILD_UTILS_SPAWN_1: Command "npm run build" exited with 1`. The message names
the build; the cause is the upload. Read `vercel inspect --logs` before
diagnosing.

`next.config.ts` keeps `outputFileTracingExcludes` for
`/api/super-admin/build-jobs/**` and `/api/super-admin/google-play-store-assets/**`:
those routes read build artifacts and Play assets off the local filesystem, so
Next's tracer cannot bound what they touch and sweeps the repository into the
function. See
[vercel-function-size-release-console.md](../08-troubleshooting/problems/vercel-function-size-release-console.md).

Preflight measures this before anything is published. `vercel:function-size:check`
runs between `build` and `build:static`, reads the route traces Next writes during
the build, and fails with the offending route and its largest contributors:

```
[vercel:function-size] api/super-admin/google-play-console is 260.5MB across 5791 files
     237.2MB  test_profile/manageProfile
```

It honours `.vercelignore`, because a file that is never uploaded cannot be inside a
function — without that it fails on the developer's machine over paths the deployment
never sees, and a guard that cries wolf locally is one people learn to skip.

### Smoke: the built server has to answer

`READY` means a deployment exists, not that a request succeeds. The pipeline
built, uploaded and polled until Vercel said READY for every target while
every server route answered 500 — and the profiles account served errors to the
browser for hours with `/api/health` returning 200 the whole time, because
health touches no shard.

Three gates close that:

| Script | Runs | Asks |
| --- | --- | --- |
| `smoke:production` | after `build`, before `build:static` | five routes on the main app, each crossing a different composition root |
| `smoke:services` | after `services:build` | one route per isolated account that reaches **that account's own data** — against a **locally built** copy |
| `smoke:deployed` | `main` phase, after `main-serving` | the same data probes against the **eight deployed origins** baked into the static/mobile bundle as `NEXT_PUBLIC_ASOL_*_URL` |

Health is deliberately not the probe. The fault these gates exist for —
a composition root that never registers a port — leaves health green and
everything else broken. `/api/health` is never used as an account probe.

Codes that mean the handler ran are accepted, and a 500, a refused connection,
or a server that never listens is not. The server's own output is scanned too,
because a route can answer 200 while a port quietly falls back to a default —
any `is not configured` line fails the check even when every status is green.

`smoke:production` and `smoke:services` run inside preflight, so a bundling or
wiring fault stops the release before the deployment commit exists.
`smoke:deployed` runs after publish: only a request to the real origin proves
the URL the mobile app will call is alive. A missing `NEXT_PUBLIC_ASOL_*` env
var fails the gate by name — accounts are never skipped.

#### What each account is asked, and why

`smoke:services` builds each service itself, probes it, and deletes the output
before moving to the next. It does not reuse `services:build`'s output:
that step deletes its own `.next` on purpose, because the CLI uploads the
service folder and Vercel builds it remotely, so a build directory left inside
would be uploaded with it. Keeping the same invariant costs a rebuild and buys
a gate that leaves nothing behind and runs standalone.

| Account | Probe | Accepts |
| --- | --- | --- |
| profiles | `GET /api/profile/store-details` | 200, 400, 404 |
| products | `GET /api/products?limit=1` | 200, 400 |
| orders | `GET /api/orders?…` | 200, 400, 401, 403, 404 |
| notifications | `POST /api/notifications/send` with a probe grant | 200, 400 |
| submain | `GET /api/search/products?…` | 200, 400 |
| sub2main | `POST /api/profile/discounts/quote` with an empty cart | 200 |

The last two were chosen after their first probes proved nothing:

- **notifications** has no `/api/notifications/preferences` — it serves `/send`
  and `/health` only — so probing it hit Next's own 404 and never reached the
  account's code. `/send` was then required to answer 200, which failed:
  `assertNotificationsEnv` rightly refuses to deliver without VAPID keys and a
  grant secret, which no local environment has. A 400 is therefore accepted,
  and what separates a missing credential from an unregistered port is the
  reason — which the route now logs rather than swallowing.
- **sub2main** serves writes only, so a GET answered 405: routing, not wiring.
  Probing `POST /api/products` was worse — `productService.create` reads a
  field before validating it, so a minimal payload crashed it with a 500 that
  would have failed every release for a fault in the probe. The quote route
  guards its input with `Array.isArray`, so an empty cart is a real read out of
  the seller-discounts repository, with no write and no crash.

A probe that accepts a rejection prints the reason the account gave, so a green
run still says which refusal it accepted. `ASOL_SERVICE_SMOKE_ONLY=<accounts>`
restricts a run to named accounts while debugging one.

#### A deployment pins what it cannot serve

Every isolated account is Turso-only and aliases `better-sqlite3` to a stub
that throws. Each therefore registers its runtime-config port with
`forceRemoteDataSource: true`, rather than letting the environment choose a
backend it cannot load. The gate found this the first time it ran inside a
real deploy: the profiles account answered 500 on every data route because the
environment said `local`.

When a deployment physically cannot serve one branch of a runtime choice, pin
it in code. Configuration can be set wrong; an invariant stated in the
composition root cannot.

#### Never let a catch hide which failure happened

`/api/notifications/send` wrapped a malformed body, missing credentials, and a
port that was never registered in one `catch` and returned all three as the
same silent 400, logging nothing. That is the shape that kept the outage
invisible for hours. A catch spanning several distinct failures must say which
one it caught, or a gate downstream cannot tell an uncomposed deployment from a
badly addressed request.

### The console pages describe commands that exist

`/dev/deploy-all` and `/dev/release-console` render entirely from
`DEPLOY_ALL_RUNBOOK`, `DEPLOY_PUSH_RUNBOOK` and `BUILD_COMMAND_CATALOG`, so they
follow the repository on their own — a branch added to the runbook appears with
no edit to the page.

Derivation cannot catch the other direction. Renaming an npm script leaves the
catalogs pointing at a command that no longer exists, and the page keeps
offering a button that fails only when someone presses it.
`npm run test:console-command-parity` closes that: every npm command those pages
can run must resolve to a real script in `package.json`. It runs inside
`build:static`, so a rename cannot reach a release.

Derivation also cannot catch a branch that the page shows but the executor
never runs. Preflight is driven by iterating `DEPLOY_ALL_PREFLIGHT_SECTIONS`;
the six service phases are driven by `SERVICE_PHASE_IDS`. The `publish` and
`main` phases are hand-coded, so a branch declared only in the runbook is inert
unless `scripts/deploy-all.ts` also names it. That already happened once:
`main-serving` was added to the runbook and never executed until it was wired
by hand. `npm run test:deploy-runbook-execution` fails when a declared branch
is neither loop-executed nor selected in the executor via a string-literal
argument to `selectedIncludes` / `runSelectedPublishBranch` (a comment or dead
string mentioning the id is not enough). The failure states that the branch
will appear on `/dev/deploy-all` and in the docs while never running. It runs
inside `build:static`.

### The gate that asks production what it serves

`npm run release:check` (`scripts/check-deployed-release.ts`) runs as the
`main-serving` branch of the `main` phase, right after `main-ready`.

`main-ready` waits for Vercel to call the deployment READY. That is a statement
about the deployment, not about the site: this pipeline once reported six
accounts READY and a main `TIMEOUT` while production served a build from an hour
earlier — and every route answered 200, because an older healthy build answers
exactly like a current one. A status code proves the site is up; only the build
identity proves it is running the change just deployed.

So the gate compares the manifest production serves with the marker committed
in the **target git revision**, not a later local rewrite of
`public/asol-web-manifest.json`. `build:static` and Android/iOS `cap sync` both
regenerate that working-tree file. Retrying only the `main` phase after such a
local rebuild must still expect the deployed commit's identity.

| | |
| --- | --- |
| Compares | `createdAt` from `git show <revision>:public/asol-web-manifest.json` vs `<origin>/asol-web-manifest.json` |
| Revision | `ASOL_RELEASE_REVISION` when set (deploy:all passes the publish SHA), else `.deploy-all/run-state.json` `revision`, else `HEAD` |
| Origin | `ASOL_PRODUCTION_ORIGIN`, else `API_BASE_URL` from `@asol/native-core` |
| Retries | `ASOL_RELEASE_CHECK_ATTEMPTS` (default 20) every 15s — a deployment can still be propagating |
| Fails with | both build ids, the git revision, and the likeliest cause |

It runs **after** `main-ready`, and it runs **whatever `main-ready` concluded**.
That is deliberate: an inconclusive Vercel verdict is exactly when the question
matters. The phase then resolves like this:

| `main-ready` | `release:check` | Outcome |
| --- | --- | --- |
| READY | serving this build | phase passes |
| READY | serving something else | **fails** — the deployment exists but is not production |
| TIMEOUT / other | serving this build | passes, logged as `SERVING` — the deployment did land, Vercel's poll just did not see it |
| TIMEOUT / other | not serving this build | fails, reporting both findings |

Run it alone at any time to answer "is my change actually live?":

```bash
npm run release:check
```

### The gate that asks the eight deployed origins

The command prints `All 9 deployed origin(s) answered…`. There are **eight**
origins; the ninth entry is a second probe against `gova`, not a ninth account.
`buildProbes()` returns `mainDeployedSmokeProbes()` (two: gova's own
`/api/health`, plus a legacy Business API path that must answer `307` and hand
the caller to its owner instead of executing it), then control, then the six
workloads. The script's own message counts probes while calling them origins.

`npm run smoke:deployed` (`scripts/check-deployed-origins.ts`) runs as the
`deployed-smoke` branch of the `main` phase, right after `main-serving`.

`smoke:services` proves a locally built service answers. It does not prove the
origin the Capacitor bundle will call. Those origins are the eight
`NEXT_PUBLIC_ASOL_*_URL` values the static build bakes in — one per account in
`ACCOUNT_ORIGIN_ENV`, matching the eight `assertStatic*BaseUrl` calls
`@asol/ota-core/publishing` makes in `build-out.ts`. Both
`smoke:services` and `smoke:deployed` read probe path/method/body/accept from
`scripts/release-service-smoke-probes.ts` so the tables cannot drift; main
reuses the products data read for `NEXT_PUBLIC_ASOL_API_BASE_URL`.

| Env var | Account | Probe (same as `smoke:services`, plus main) |
| --- | --- | --- |
| `NEXT_PUBLIC_ASOL_API_BASE_URL` | main (`gova`) | `GET /api/products?limit=1` |
| `NEXT_PUBLIC_ASOL_PROFILES_URL` | profiles | `GET /api/profile/store-details?uid=asol_smoke_probe` |
| `NEXT_PUBLIC_ASOL_PRODUCTS_URL` | products | `GET /api/products?limit=1` |
| `NEXT_PUBLIC_ASOL_ORDERS_URL` | orders | `GET /api/orders?…` |
| `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL` | notifications | `POST /api/notifications/send` with probe grant |
| `NEXT_PUBLIC_ASOL_SUBMAIN_URL` | submain | `GET /api/search/products?…` |
| `NEXT_PUBLIC_ASOL_SUB2MAIN_URL` | sub2main | `POST /api/profile/discounts/quote` with empty cart |

Accepted status codes match `smoke:services` (and main reuses the products
accept list). A 500 always fails. Response bodies are scanned for
`is not configured`. Failures print the account, URL, status, and body. A
missing env var fails naming the variable — no account is skipped.

```bash
npm run smoke:deployed
```

### The in-flight lock, and why it never blocks a push

`deploy:all` writes `.deploy-all/in-flight.lock` (pid + start time) when a run
begins and removes it in a `finally`. It is gitignored, and it exists only to
tell tooling outside the process that a release is mid-run.

It exists because of the interaction below: a guard that answers a dirty tree by
committing and pushing cancels the very deployment the run created. The lock
buys that guard a pause — never an exemption. **Pushing to `main` remains the
rule; nothing may leave work unpushed.** So the pause holds only while the
deploy process is genuinely alive:

| Situation | Guard |
| --- | --- |
| Run in progress, pid alive | paused |
| Run finished or failed normally | active — the `finally` removed the lock |
| Run killed outright | active on the next check — the recorded pid is gone |
| Lock older than 2h (reused pid) | active — final backstop |

Deliberately not `run-state.json`: that file outlives a run by design and says
nothing about whether one is in progress.

### Do not push to `main` while `deploy:all` is running

No account deploys from Git: `vercel.json` disables Git deployments for every
branch, `main` included, and every project — `gova` too — is updated only when
its deploy command runs. A concurrent push therefore cannot replace a build the
run is waiting on.

It breaks the run a different way. `deploy:all` publishes by committing and
pushing `main` itself, and the release transaction pins one revision from that
commit through control, the six workloads, readiness, and the explicit `gova`
deployment. A push that lands in between moves `origin/main` under the run: the
`publish` phase is rejected as non-fast-forward, or — after publish — the SHA
that production serves stops matching the SHA the run marked ready, and
`release:check` fails.

This is easy to cause without noticing, because several preflight phases rewrite
tracked files as a side effect of running:

- every phase that boots a server re-runs schema sync and rewrites
  `public/sync_data/*.json` (timestamps only);
- `build:static` rewrites `public/asol-web-manifest.json` with a new build id.

Committing and pushing each of those mid-run — to keep the tree clean — is what
moves `origin/main`. Let the run's own publish phase commit them instead; that is
what it is for.

If it happens: don't re-run `--phase=main` against a stale `run-state.json`,
which replays the cached result without deploying, and don't delete that file to
force a retry — it holds the progress of *every* phase, so the next
`--phase=main` refuses on unmet prerequisites. Start a fresh
`deploy:all --allow-empty` for the commit that is now on `origin/main`; nothing
else publishes it, because no branch deploys from Git.

To confirm what production is actually serving, compare the deployed manifest to
the local one:

```bash
curl -s https://gova-swart.vercel.app/asol-web-manifest.json | grep createdAt
grep createdAt public/asol-web-manifest.json
```

A 200 from a route proves the site is up, not that it is running your change.

### Escape hatches

Each is opt-in, and none is the default:

| Flag | Effect |
| :-- | :-- |
| `--skip-preflight` | Skips the comprehensive preflight. Prints every skipped check and records the shortcut in the commit message body, so it stays visible in history. |
| `--allow-scratch-files` | Publishes files matching the scratch patterns. |
| `--allow-manifest-downgrade` | Publishes a lower release manifest. |
| `--allow-empty` | Redeploys the current commit with nothing to change. |

An unrecognised option aborts rather than being ignored, so a mistyped
`--skip-preflght` can never be read as something more permissive.

### Phased runs (retry one step)

`deploy:all` is split into ordered phases. A failure stops the run; fix the
problem and retry **only** the failed phase (or continue from it). Progress is
stored in `.deploy-all/run-state.json` (gitignored).

The phase order is declared once in
`packages/release-core/src/pipeline/phases.ts` as `DEPLOY_ALL_PHASE_ORDER`:

```text
preflight → publish → control → notifications → products → orders → profiles
          → submain → sub2main → readiness → main
```

| Phase | What it does |
| :-- | :-- |
| `preflight` | Branch/credential guards + production/Vercel readiness + checks/tests + DB sync + server/static builds + service mirror verification/builds |
| `publish` | `secrets:backup`, deployment commit, `git push origin main` |
| `control` | One CLI deploy of `asol-control` at the same SHA — its own mandatory step, never one of the six workloads |
| `notifications` … `sub2main` | One CLI service deploy each (six accounts) |
| `readiness` | Publish exact-SHA release readiness to control's production-deploy callback |
| `main` | Explicitly deploy `gova` (`main:deploy`) and wait for `READY`, confirm production serves this build (`release:check`), then `smoke:deployed` against the eight origins |

There is no per-phase npm script. Phases are selected on `deploy:all` itself:

```bash
npm run deploy:all                          # all phases in order
npm run deploy:all -- --phase=preflight     # preflight only
npm run deploy:all -- --phase=publish       # publish only (requires preflight in state)
npm run deploy:all -- --phase=services      # alias for all six service phases
npm run deploy:all -- --phase=main          # deploy and verify gova only
npm run deploy:all -- --phase=submain       # retry one service
npm run deploy:all -- --from-phase=orders   # orders → … → readiness → main
npm run deploy:all -- --list-phases
```

`--phase=services` is an alias for the six service phases. `--revision=<sha>`
overrides the saved revision when retrying deploy phases after a manual fix.
`--skip-preflight` removes the `preflight` prerequisite for `publish`.

After the deployment table, the run reports whether the native surface has
changed since the last store release. `ota:publish` refuses while it has, so the
operator learns here instead of at the next OTA attempt; the baseline is
reported only and never re-tagged automatically. If a deployment fails after the
push, the exact `git revert` and Vercel rollback steps are printed.

The final console line is always explicit:

- success: `[deploy:all] SUCCESS — preflight passed, secrets backup completed, GitHub push completed, and all 7 Vercel production targets are READY.`
- success with `--skip-preflight`: `preflight skipped` appears in the same line.
- failure: `[deploy:all] FAILED — <reason>` (with `git revert` guidance when the
  push already landed).

`scripts/tests/deploy-all.test.ts` covers the refusals, including that importing
the module does not deploy — the entrypoint is guarded so `npm test` can never
become a release.

### `deploy:push` and `deploy:push:fast` — explicit publish

Both run `scripts/deploy-push.ts` pinned to `--vercel-target=all`, and both
publish the complete transaction: control, six workloads, readiness, and gova.
Neither has an account-selection, revision, or partial-target form.

They differ only in `--fast`. `deploy:push` runs the publish gates first —
Vercel account access, the scratch-file / manifest-downgrade / non-empty
refusals, `secrets:backup`, and the mirror builds (`services:sync`,
`services:build`, `control:build`). `deploy:push:fast` skips all of those and
keeps only the branch check, secret restore and release credentials.

Service deploy scripts emit `[ASOL_DEPLOY_REPORT]` on stdout. `deploy:push:fast`
and `deploy:all` capture that line from the child npm process (stdout and stderr,
after streams close) via `packages/release-core/src/pipeline/run-deployment-npm-script.ts`. Child
processes run without `NODE_OPTIONS` / VS Code inspector hooks so nested
`npx tsx` deploy scripts keep piped output reliable. VS Code launch configs for
deploy run `npx tsx scripts/deploy-*.ts` with `autoAttachChildProcesses: false`.
Service mirror manifests preserve their previous `generatedAt` when the mirrored
entry points and file list did not change, so a successful deploy does not leave
timestamp-only manifest drift in the working tree.

After GitHub confirms the commit, the transaction deploys the six workloads,
then control, publishes exact-SHA readiness, and finally deploys gova. Every
target must be `READY`; a failure retracts readiness and re-promotes the captured
baseline. `deploy:push:fast` does not replace the native or OTA release gate;
use `deploy:all` when those checks are required.

The command verifies that the new commit leaves the working tree clean, so every
Vercel account receives the same revision. A zero exit code from an upload is not
success: every target is polled by exact run id until `READY`, `ERROR`,
`CANCELED`, or timeout. Gova is an explicit CLI deployment after readiness, not
a Git-triggered deployment. The final console table shows target, account,
project, unique comment, state, URL, and Vercel error.

Each service continues to read its dedicated Vercel token and required
environment values from `.env.local` or `.env`. `VERCEL_TOKEN` and the root
`.vercel/project.json` are required for the explicit gova deployment. The root
link is never rewritten by a service command.

The Vercel CLI is intentionally not a project dependency. Each isolated service
deployment invokes `vercel@59.0.0` as an ephemeral `npx --package` tool, keeping
its large framework-builder dependency graph out of the application lockfile
and deployed runtime. Update the identical pin in the deploy core and all
isolated deploy scripts
together after verifying the CLI.

## Static export

- Output: `out/` — no Next.js server
- All data via `AsolApiClient` → remote backend → Turso
- Set `NEXT_PUBLIC_ASOL_API_BASE_URL` before `npm run build:static`

## Capacitor

See [capacitor.md](./capacitor/capacitor.md) for live reload, `cap:build`, and platform defaults.

## Build pipeline (hosted)

```
npm run app:init
npm run architecture:check
npm run db:ensure
npm run db:schema:sync
next build
```

Schema sync requires Turso env vars on CI/Vercel — see [20-schema-provisioning.md](../02-data-and-storage/schema-provisioning.md).

The root `.vercelignore` trims repository-root Vercel uploads (`gova` via GitHub
and `asol-submain` / `asol-sub2main` via CLI). It excludes native shells at the repository root only (`/android/`, `/ios/`,
`/fastlane/`), `docs/`, local SQLite mirrors (`public/sync_data/`), service
`generated/` trees, CI/editor folders, and secret archives. It keeps `src/`,
`packages/` (including `packages/native-core/{android,ios}` for contract tests),
hand-written `services/*` sources, `scripts/`, and runtime `public/` assets.

`scripts/tests/vercelignore-contract.test.ts` guards required and excluded paths.
The file excludes `.env*` but explicitly re-includes `!.env.example`.
`npm run build` runs `ios:push:validate`, `notification-sound-contract`, and
`android-notification-inbox-contract`, which exit immediately when root
`android/` / `ios/` shells are not uploaded; `deploy:all` preflight already runs
the full checks locally before push.

Every database in the sync set needs its credentials present, the notifications
database included. A missing `TURSO_NOTIFICATIONS_*` pair fails the whole build,
not just notifications: `db:schema:sync` runs before `next build`. Run
`npm run db:push:vercel-env` after adding any database.

## Build pipeline (notifications service)

```
npx tsx scripts/sync-service-sources.ts notifications   # mirror src/ into generated/
vercel deploy --prod                                    # upload services/notifications, build remotely
```

No schema sync and no page prerendering, so this build touches no database at
all — which is why the notifications account holds no users, product, or shard
credentials. See
[Notifications Service Module](../05-platform-features/notifications-service-module.md).
