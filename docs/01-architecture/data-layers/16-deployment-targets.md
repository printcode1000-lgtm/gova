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

The first four share **identical application code** — only environment
configuration changes.

## Five Vercel accounts

Four targets are not the main application, and none of them may be called by
it: every crossing goes through a browser-only bridge.

| | Main app | Notifications | Products | Orders | Profiles |
|---|---|---|---|---|---|
| Vercel project | `gova` | `asol-notifications` | `asol-products` | `asol-orders` | `asol-profiles` |
| GitHub | connected — every push redeploys | **not connected** | **not connected** | **not connected** | **not connected** |
| Updated by | pushing to the repository | `npm run notifications:deploy` | `npm run products:deploy` | `npm run orders:deploy` | `npm run profiles:deploy` |
| Uploaded files | the repository | `services/notifications/` | `services/products/` | `services/orders/` | `services/profiles/` |
| Serves | everything else | push fan-out only | product reads only | the order list only | five profile reads |
| Turso account | `hesham101` | `hesham102` | `hesham103` | `hesham104` | `hesham105` |

The connectors are documented in
[Notification Bridge Module](../../05-platform-features/notification-bridge-module.md)
and [Service Bridge Module](../../05-platform-features/service-bridge-module.md).

Keep the main project's GitHub connection as it is. The deploy command runs the
CLI with `services/notifications` as its working directory, so it writes that
folder's `.vercel`, never the repository root's link.

## One-command production deployment

GitHub Actions is intentionally unused. Run this command from a clean `main`
working tree:

```bash
npm run deploy:all
```

`scripts/deploy-all.ts` runs a **preflight gate before its first git write**,
because the push is what makes a release public and nothing after it may be the
first place a problem is discovered. In order, the preflight:

1. refuses a non-`main` branch;
2. requires `VERCEL_TOKEN` and the root `.vercel/project.json` up front, rather
   than at the end after the push and four service deployments;
3. runs `lint`, `typecheck`, `architecture:check`, `test`, and `build:static` —
   the release build, which also re-runs the architecture and test gates;
4. refuses to publish scratch files (`__probe*`, `*.log`, `*.tmp`, `*.bak`,
   scratchpad paths), since `git add -A` stages whatever is in the tree;
5. refuses a downgrade of `releaseId`, `version`, or `minimumNativeVersion` in
   `public/asol-web-manifest.json` — what a verification-only `build:static`
   produces when the release environment variables are unset;
6. refuses an empty run whose `HEAD` already matches `origin/main`.

Only then does it create or verify the encrypted secret backup, stage the
complete working tree, and create a main deployment commit named
`deploy(main): <ISO timestamp>`. It pushes `main` to GitHub, which lets the one
existing GitHub integration update `gova`. The other four projects remain
disconnected from GitHub and deploy sequentially through their dedicated
tokens. Each account receives its own visible comment, for example
`deploy(products): <timestamp> @ <revision>`, plus target/run/revision metadata.
This avoids ambiguous CLI deployments and concurrent downloads sharing one npm
cache.

### Escape hatches

Each is opt-in, and none is the default:

| Flag | Effect |
| :-- | :-- |
| `--skip-preflight` | Skips step 3. Prints every skipped check and records the shortcut in the commit message body, so it stays visible in history. |
| `--allow-scratch-files` | Publishes files matching the scratch patterns. |
| `--allow-manifest-downgrade` | Publishes a lower release manifest. |
| `--allow-empty` | Redeploys the current commit with nothing to change. |

An unrecognised option aborts rather than being ignored, so a mistyped
`--skip-preflght` can never be read as something more permissive.

After the deployment table, the run reports whether the native surface has
changed since the last store release. `ota:publish` refuses while it has, so the
operator learns here instead of at the next OTA attempt; the baseline is
reported only and never re-tagged automatically. If a deployment fails after the
push, the exact `git revert` and Vercel rollback steps are printed.

`scripts/tests/deploy-all.test.ts` covers the refusals, including that importing
the module does not deploy — the entrypoint is guarded so `npm test` can never
become a release.

The command verifies that the new commit leaves the working tree clean, so every
Vercel account receives the same revision. A
zero exit code from the upload process is not considered success. Every service
polls the Vercel API for the deployment tagged with this exact run id until it is
`READY`, `ERROR`, `CANCELED`, or times out; alias failures turn an otherwise
ready build into an error. The main GitHub-triggered deployment is independently
matched by commit SHA and monitored the same way. The final console table always
shows target, account, project, unique comment, state, URL, and Vercel error.
`deploy:all` exits non-zero if any of the five production targets is not verified
`READY`.

Each service continues to read its dedicated Vercel token and required
environment values from `.env.local` or `.env`. `VERCEL_TOKEN` and the root
`.vercel/project.json` are additionally required to verify the GitHub-linked
main deployment. The root link is never rewritten by a service command.

The Vercel CLI is intentionally not a project dependency. Each isolated service
deployment invokes `vercel@59.0.0` as an ephemeral `npx --package` tool, keeping
its large framework-builder dependency graph out of the application lockfile
and deployed runtime. Update the identical pin in all four deploy scripts
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
