# Service Composition

## Purpose

Explain how `*-composition` packages and `services/*/` deployments assemble capability subsets for separate Vercel accounts.

## Scope

Six service mirrors: notifications, orders, products, profiles, submain, sub2main. Main app (`gova`) is not a composition package. Deployment detail: [docs/07-mobile-and-release/](../../07-mobile-and-release/).

## Architecture

```text
services/<account>/
├── src/app/              Next.js routes for this account
└── generated/            synced by npm run services:sync from import graph

packages/<account>-composition/
└── src/                  builds runtime object from @/ + @asol/*
```

Each composition:

1. Imports `@asol/account-declarations/<account>` for env key names and project metadata
2. Imports capability doors the account credentials allow
3. Imports `@/features/*` services to implement ports
4. Exports a composed runtime tested by capability-closure tests

## Account task groupings

| Account | Runtime tasks |
|---|---|
| `orders` | `database`, `config` |
| `products` | `database`, `catalog`, `images`, `config` |
| `profiles` | `database`, `images`, `config` |
| `notifications` | `crypto`, `delivery`, `config` |
| `submain` | `search`, `cart`, `catalog`, `config` |
| `sub2main` | `profile`, `products`, `storage`, `catalog`, `config` |

**Absent task = absent credential.** Tests assert `!('images' in runtime)` for accounts without R2 write tokens.

## Service mirror sync

`@asol/service-mirror-core` copies sealed package sources into `services/*/generated/` by walking import graphs.

| Risk | Mitigation |
|---|---|
| Dynamic import invisible to walker | Prefer static imports in composition entry |
| Missing module at Vercel runtime | `npm run services:verify` + `services:build` in deploy preflight |
| Stale generated/ | `npm run services:sync` before build |

## Notifications special case

`@asol/notifications-composition` is the only composition with a direct `@asol/notifications-core` edge. Other accounts reach DB/storage through application data-access layers rather than sealed read packages.

## Verification gates

```bash
npm run services:sync
npm run services:verify
npm run services:build
npm run test:compositions
```

Included in `npm run build` and `deploy:all` preflight.

## Cloud accounts

Each Vercel/Turso/R2 account must appear on `/super-admin/cloud-accounts`. See [docs/06-super-admin-and-operations/super-admin-cloud-accounts.md](../../06-super-admin-and-operations/super-admin-cloud-accounts.md).

## Source Map

- Compositions: `packages/*-composition/`
- Services: `services/*/`
- Mirror: `packages/service-mirror-core/`
- Declarations: `packages/account-declarations/`

## Related Documents

- [Composition Model](./composition-model.md)
- [Service Boundaries](../06-runtime-boundaries/service-boundaries.md)
- [Application-Package Boundaries](../06-runtime-boundaries/application-package-boundaries.md)

## Change Impact

New service account touches declarations, composition, service folder, sync graph, deploy scripts, and super-admin UI.

## Invariants

1. Six composition packages match six service folders.
2. Compositions use per-account declaration doors only.
3. `test:compositions` gates the build.
