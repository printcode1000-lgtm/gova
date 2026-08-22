# Deployment Targets

| Target | Command | API | Database |
|--------|---------|-----|----------|
| Local development | `npm run dev` | Same origin `/api/*` | SQLite |
| Hosted backend | `npm run build` + deploy | Same origin or remote | Turso |
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

## Seven Vercel accounts

Five read-only or push-only targets are not the primary GitHub-linked main
application, and none of them may be called by it directly: every crossing goes
through a browser-only bridge. Two additional accounts (`submain`, `sub2main`)
host the same full application codebase for isolated UI work and are updated
only through their CLI deploy commands.

| | Main app | Submain app | Sub2main app | Notifications | Products | Orders | Profiles |
|---|---|---|---|---|---|---|---|
| Vercel project | `gova` | `asol-submain` | `asol-sub2main` | `asol-notifications` | `asol-products` | `asol-orders` | `asol-profiles` |
| GitHub | connected — every push redeploys | **not connected** | **not connected** | **not connected** | **not connected** | **not connected** | **not connected** |
| Updated by | pushing to the repository | `npm run submain:deploy` | `npm run sub2main:deploy` | `npm run notifications:deploy` | `npm run products:deploy` | `npm run orders:deploy` | `npm run profiles:deploy` |
| Uploaded files | the repository | the repository | `services/notifications/` | `services/products/` | `services/orders/` | `services/profiles/` |
| Serves | production primary | isolated full-app staging | isolated full-app staging | push fan-out only | product reads only | the order list only | five profile reads |
| Turso account | `hesham101` (+ all shards via env) | same runtime env as `gova` | same runtime env as `gova` | `hesham102` | `hesham103` | `hesham104` | `hesham105` |

The connectors are driven by seven sealed capability packages under `packages/`: `@asol/vercel-deploy-core`, `@asol/service-mirror-core`, `@asol/account-bridge`, `@asol/notifications-composition`, `@asol/products-composition`, `@asol/orders-composition`, and `@asol/profiles-composition`. See [26-cloud-accounts.md](./26-cloud-accounts.md), [Notification Bridge Module](../../05-platform-features/notification-bridge-module.md), and [Service Bridge Module](../../05-platform-features/service-bridge-module.md).

Keep the main project's GitHub connection as it is. The deploy command runs the
CLI with `services/notifications` as its working directory, so it writes that
folder's `.vercel`, never the repository root's link.

## One-command production deployment

GitHub Actions is intentionally unused. Two commands push `main` to production
from a local `main` working tree:

```bash
npm run deploy:all    # full preflight, then publish
npm run deploy:push   # publish only — no lint/build/test gates
```

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
`submain:deploy`, and `sub2main:deploy`. The final `main` phase contains one
verification branch that matches the GitHub-linked deployment by commit SHA and
waits until it is `READY`.

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

Only then does it create or verify the encrypted secret backup, stage the
complete working tree, and create a main deployment commit named
`deploy(main): <ISO timestamp>`. It pushes `main` to GitHub, which lets the one
GitHub-linked Vercel project auto-deploy. The retry path — a second `git push`
using `GITHUB_ADMIN_TOKEN` from `.env.local` when the plain push is rejected —
is now dead code in practice: `main` carries no branch protection and no ruleset,
so nothing rejects the first attempt. It is kept because it costs nothing and
covers the case where protection is put back.
existing GitHub integration update `gova`. The other six projects remain
disconnected from GitHub and deploy sequentially through their dedicated
tokens. Each account receives its own visible comment, for example
`deploy(products): <timestamp> @ <revision>`, plus target/run/revision metadata.
This avoids ambiguous CLI deployments and concurrent downloads sharing one npm
cache.

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

| Phase | What it does |
| :-- | :-- |
| `preflight` | Branch/credential guards + production/Vercel readiness + checks/tests + DB sync + server/static builds + service mirror verification/builds |
| `publish` | `secrets:backup`, deployment commit, `git push origin main` |
| `notifications` … `sub2main` | One CLI service deploy each (six accounts) |
| `main` | Wait until the GitHub-linked `gova` production deployment is `READY` |

```bash
npm run deploy:all                      # all phases in order
npm run deploy:all:preflight            # phase 1 only
npm run deploy:all:publish              # phase 2 only (requires preflight in state)
npm run deploy:all:services             # all six service phases
npm run deploy:all:main                 # verify gova only

npm run deploy:all -- --phase=submain   # retry one service
npm run deploy:all -- --from-phase=orders   # orders → profiles → submain → sub2main → main
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

### `deploy:push` — publish and verify only

`scripts/deploy-push.ts` skips the expensive preflight gates: no lint, typecheck,
tests, builds, database sync, or service mirror build. It still runs fast safety
guards before the first git write: main branch, required Vercel account access
for the selected targets, scratch-file refusal, release-manifest downgrade
refusal, and non-empty deployment refusal unless explicitly allowed. At startup
it asks which isolated Vercel **service** account(s) to deploy (or accepts
`--vercel-target=` on the command line). These three steps are **always
mandatory**:

1. `secrets:backup`
2. GitHub push to `main` with `origin/main` verification
3. main (`gova`) Vercel verification until `READY`

Interactive choices:

| Key | Target |
| :-- | :-- |
| 0 | GitHub + main only — no service deploys |
| 1 | `notifications` |
| 2 | `products` |
| 3 | `orders` |
| 4 | `profiles` |
| 5 | `submain` (`asol-submain`, `groupstenderximages@gmail.com`) |
| 6 | `sub2main` (`asol-sub2main`, `tenderx.engineer100@gmail.com`) |
| 7 | all six isolated accounts (4 services + `asol-submain` + `asol-sub2main`) |

Non-interactive examples:

```bash
npm run deploy:push:main
npm run deploy:push:all
npm run deploy:push -- --vercel-target=main
npm run deploy:push -- --vercel-target=none
npm run deploy:push -- --vercel-target=notifications
npm run deploy:push -- --vercel-target=submain
npm run deploy:push -- --vercel-target=sub2main
npm run deploy:push -- --vercel-target=all
```

On Windows, `npm run deploy:push -- --vercel-target=...` may not forward args;
use `deploy:push:main` / `deploy:push:all` or `npx tsx scripts/deploy-push.ts
--vercel-target=...` directly.

Service deploy scripts emit `[ASOL_DEPLOY_REPORT]` on stdout. `deploy:push` and
`deploy:all` capture that line from the child npm process (stdout and stderr,
after streams close) via `packages/release-core/src/pipeline/run-deployment-npm-script.ts`. Child
processes run without `NODE_OPTIONS` / VS Code inspector hooks so nested
`npx tsx` deploy scripts keep piped output reliable. VS Code launch configs for
deploy run `npx tsx scripts/deploy-*.ts` with `autoAttachChildProcesses: false`.
Service mirror manifests preserve their previous `generatedAt` when the mirrored
entry points and file list did not change, so a successful deploy does not leave
timestamp-only manifest drift in the working tree.

`--vercel-target=main` and `--vercel-target=none` skip the six isolated deploy
scripts (four services plus `asol-submain` and `asol-sub2main`). Any other choice still runs the
mandatory steps above, then deploys and verifies only the selected account(s).

When no isolated account is chosen, success requires secrets backup, GitHub
verification, and main `READY` on Vercel. When an isolated account is also
chosen, that account must reach `READY` as well. `submain` uses
`VERCEL_SUBMAIN_TOKEN` and `VERCEL_SUBMAIN_ORG_ID`; `sub2main` uses
`VERCEL_SUB2MAIN_TOKEN` and `VERCEL_SUB2MAIN_ORG_ID`. Neither is GitHub-linked.

`VERCEL_TOKEN` and the root `.vercel/project.json` are always required for main
verification. Selected isolated accounts use their own tokens from `.env.local`
/ `.env`, and those tokens are checked before `secrets:backup`, `commit`, or
`push`.

Fast safety escape hatches are explicit:

| Flag | Effect |
| :-- | :-- |
| `--allow-empty` | Redeploys the current commit when there is nothing new to commit. |
| `--allow-scratch-files` | Allows files matching scratch patterns such as `*.log`, `*.tmp`, `*.bak`, or `scratchpad/`. |
| `--allow-manifest-downgrade` | Allows a lower `releaseId`, `version`, or `minimumNativeVersion` in `public/asol-web-manifest.json`. |

It still does not report native/OTA surface status; use `deploy:all` for the
full release gate.

The final console line is always explicit:

- main only: `[deploy:push] SUCCESS — secrets backup completed, GitHub push verified, and main Vercel production target is READY.`
- with services: `[deploy:push] SUCCESS — secrets backup completed, GitHub push verified; main and <service(s)> Vercel production targets are READY.`
- failure: `[deploy:push] FAILED — <reason>` (with `git revert` guidance when the
  push already landed).

`scripts/tests/deploy-push.test.ts` asserts target parsing and that importing the
module does not deploy.

The command verifies that the new commit leaves the working tree clean, so every
Vercel account receives the same revision. A
zero exit code from the upload process is not considered success. Every service
polls the Vercel API for the deployment tagged with this exact run id until it is
`READY`, `ERROR`, `CANCELED`, or times out; alias failures turn an otherwise
ready build into an error. The main GitHub-triggered deployment is independently
matched by commit SHA and monitored the same way. The final console table always
shows target, account, project, unique comment, state, URL, and Vercel error.
`deploy:all` exits non-zero if any of the seven production targets is not verified
`READY`.

Each service continues to read its dedicated Vercel token and required
environment values from `.env.local` or `.env`. `VERCEL_TOKEN` and the root
`.vercel/project.json` are additionally required to verify the GitHub-linked
main deployment. The root link is never rewritten by a service command.

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

See [capacitor.md](../capacitor.md) for live reload, `cap:build`, and platform defaults.

## Build pipeline (hosted)

```
npm run app:init
npm run architecture:check
npm run db:ensure
npm run db:schema:sync
next build
```

Schema sync requires Turso env vars on CI/Vercel — see [20-schema-provisioning.md](./20-schema-provisioning.md).

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
npx tsx scripts/sync-notifications-service-sources.ts   # mirror src/ into generated/
vercel deploy --prod                                    # upload services/notifications, build remotely
```

No schema sync and no page prerendering, so this build touches no database at
all — which is why the notifications account holds no users, product, or shard
credentials. See
[Notifications Service Module](../../05-platform-features/notifications-service-module.md).
