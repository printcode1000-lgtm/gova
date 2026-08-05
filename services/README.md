# Deployment Modules

Each Vercel account this project deploys to owns exactly one module. Nothing is
shared between deployments except source that is mirrored explicitly.

| Vercel account | Project | Module | Uploaded files | Updated by |
|---|---|---|---|---|
| `hesham-101` (`team_uksNmh…`) | `gova` | the repository root — `src/`, `public/`, `platform/`, `scripts/` | the repository, minus `services/` | pushing to GitHub (connected) |
| `101-0902` (`team_cmIfma…`) | `asol-notifications` | [`services/notifications/`](./notifications) | that folder alone | `npm run notifications:deploy` (no GitHub connection) |
| *(none — runs in the browser)* | — | `src/modules/notification-bridge/` | ships inside the main app's client bundle | with the main app |

## The connector

The two deployed modules **never call each other**. Neither holds the other's
URL and neither has a code path to it. The third module — the notification
bridge — is the only link, and it is deployed to no account at all: it runs in
the user's browser.

```text
                    browser (notification-bridge)
                    ╱                          ╲
        gova ──────╱                            ╲────── asol-notifications
   signs a grant                                  verifies it and delivers
```

`gova` decides who should be notified — it holds the users and orders data.
`asol-notifications` delivers — it holds the Firebase and APNs credentials.
The grant is that decision in transit, signed whole so the browser can carry it
without being able to change it.

See [Notification Bridge Module](../docs/05-platform-features/notification-bridge-module.md).

## Rules

1. **One module per account.** A new deployment target gets its own folder here,
   never a second entry point inside an existing module.
2. **No cross-module imports, and no cross-module calls.** A deployed module may
   not import from another module's source tree, and may not address another
   module over HTTP. Anything that has to cross the boundary goes through a
   connector that runs in the browser.
3. **Shared source is mirrored, not forked.** A module that needs code from
   `src/` gets it through a sync script that walks the real import graph, plus a
   contract test proving the mirror is reproducible. See
   `scripts/sync-notifications-service-sources.ts`.
4. **The main app keeps its GitHub connection.** Deploy commands for other
   modules run with their own folder as the working directory, so they write
   that folder's `.vercel`, never the repository root's link.

## Why the main app is not a folder here

The main application *is* the repository: Capacitor, the static export, the
build pipeline, and the existing GitHub-connected Vercel project all resolve
paths from the root. Relocating it under `services/` would rename every path in
the project for no functional gain, so the root is its module and `services/`
holds the deployments that are genuinely separate from it.

## Documentation

- [Notifications Service Module](../docs/05-platform-features/notifications-service-module.md)
- [Deployment Targets](../docs/01-architecture/data-layers/16-deployment-targets.md)
