# Deployment Targets

| Target | Command | API | Database |
|--------|---------|-----|----------|
| Local development | `npm run dev` | Same origin `/api/*` | SQLite |
| Hosted backend | `npm run build` + deploy | Same origin or remote | Turso |
| Static export (GitHub Pages) | `npm run build:static` | Remote via `ASOL_API_BASE_URL` | None (SPA only) |
| Capacitor (Android / iOS) | `npm run cap:build` | Baked API URL | None (shell over `out/`) |
| Notifications service | `npm run notifications:deploy` | Own origin, `/api/notifications/send` | Notifications Turso only |

The first four share **identical application code** — only environment
configuration changes.

## Two Vercel accounts

The notifications service is the one target that is not the main application.

| | Main app | Notifications service |
|---|---|---|
| Vercel project | `gova` | `asol-notifications` |
| GitHub | connected — every push redeploys | **not connected** — a push changes nothing |
| Updated by | pushing to the repository | `npm run notifications:deploy` only |
| Uploaded files | the repository | `services/notifications/` alone |
| Serves | everything except push fan-out | push fan-out only |

Keep the main project's GitHub connection as it is. The deploy command runs the
CLI with `services/notifications` as its working directory, so it writes that
folder's `.vercel`, never the repository root's link.

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
