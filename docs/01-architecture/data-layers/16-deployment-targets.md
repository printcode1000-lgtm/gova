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

`scripts/deploy-all.ts` first creates or verifies the encrypted secret backup,
then stages the complete working tree and creates a deployment commit whose
message contains the current ISO date and time. It pushes `main` to GitHub,
which lets the existing Vercel integration update `gova`. After the push
succeeds, it starts the notifications, products, orders, and profiles production
deploy commands in parallel and waits for all four. It performs no tests and
does not build a static bundle or APK.

The command refuses a non-`main` branch and verifies that the new commit leaves
the working tree clean, so every Vercel account receives the same revision. Each
service continues to read its dedicated Vercel token and required environment
values from `.env.local` or `.env`.

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
