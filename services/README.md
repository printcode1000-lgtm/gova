# Deployment Modules

Each Vercel account this project deploys to owns exactly one module. Nothing is
shared between deployments except source that is mirrored explicitly.

| Vercel account | Email | Project | Module | Uploaded files | Updated by |
|---|---|---|---|---|---|
| `hesham-101` (`team_uksNmh…`) | `print.code.1000@gmail.com` | `gova` | the repository root — `src/`, `public/`, `platform/`, `scripts/` | the repository, minus `services/` | pushing to GitHub (connected) |
| `submain` | `groupstenderximages@gmail.com` | `asol-submain` | the repository root (same as `gova`) | repository root minus paths in `.vercelignore` | `npm run submain:deploy` (no GitHub connection) |
| `sub2main` | `tenderx.engineer100@gmail.com` | `asol-sub2main` | the repository root (same as `gova`) | repository root minus paths in `.vercelignore` | `npm run sub2main:deploy` (no GitHub connection) |
| `101-0902` (`team_cmIfma…`) | `bs.bid.story@gmail.com` | `asol-notifications` | [`services/notifications/`](./notifications) | that folder alone | `npm run notifications:deploy` (no GitHub connection) |
| products account | `gnagnahesham@gmail.com` | `asol-products` | [`services/products/`](./products) | that folder alone | `npm run products:deploy` (no GitHub connection) |
| orders account | `tenderx10@gmail.com` | `asol-orders` | [`services/orders/`](./orders) | that folder alone | `npm run orders:deploy` (no GitHub connection) |
| profiles account | `hesham10125@gmail.com` | `asol-profiles` | [`services/profiles/`](./profiles) | that folder alone | `npm run profiles:deploy` (no GitHub connection) |
| *(none — runs in the browser)* | — | `src/features/notification-bridge/` | ships inside the main app's client bundle | with the main app |
| *(none — runs in the browser)* | — | `src/features/service-bridge/` | ships inside the main app's client bundle | with the main app |

Each deployed module also owns its own Turso account: users and system operations
on `hesham101`, notifications on `hesham102`, products on `hesham103`, orders on
`hesham104`, profiles on `hesham105`.

## The connectors

The deployed modules **never call each other**. None of them holds another's URL
and none has a code path to one. Every crossing goes through a bridge module,
and a bridge is deployed to no account at all: it runs in the user's browser.

```text
                          browser
        ╱───────────────────┼───────────────────╲
       ╱                    │                    ╲
  gova ◄── service-bridge ──┼──► asol-products
       ╲                    │    asol-orders
        ╲                   │    asol-profiles
         ╲── notification-bridge ──► asol-notifications
```

**Notifications.** `gova` decides who should be notified — it holds the users
and orders data — and signs that decision as a grant. `asol-notifications`
delivers, holding the Firebase and APNs credentials. The grant is signed whole,
so the browser can carry it without being able to change it.
See [Notification Bridge Module](../docs/05-platform-features/notification-bridge-module.md).

**Products, orders and profiles.** The browser sends product *reads* to
`asol-products`, the order *list* to `asol-orders`, and five profile *reads* to
`asol-profiles`; everything else goes to `gova`.

Writes stay on `gova` in all three cases, for the same underlying reason: they touch
data the read account cannot see. A product write rewrites denormalised counts
in the profile shards; an order write spans several order shards plus the
profile and product databases; a profile write goes through image storage.
`GET /api/orders/:id` stays too — it enriches the order with profile contacts
and store details, and so do `/api/profile/reviews` and `/api/profile/discounts`,
which read the product database as well.
See [Service Bridge Module](../docs/05-platform-features/service-bridge-module.md).

The two bridges differ in kind: the notification one carries an authorisation
after a response, the service one only chooses an address before a request.

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
- [Products Service Module](../docs/05-platform-features/products-service-module.md)
- [Orders Service Module](../docs/05-platform-features/orders-service-module.md)
- [Profiles Service Module](../docs/05-platform-features/profiles-service-module.md)
- [Service Bridge Module](../docs/05-platform-features/service-bridge-module.md)
- [Deployment Targets](../docs/07-mobile-and-release/deployment-targets.md)
