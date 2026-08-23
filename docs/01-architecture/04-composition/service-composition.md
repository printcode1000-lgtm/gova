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
npm run smoke:services
npm run test:compositions
```

Included in `npm run build` and `deploy:all` preflight.

`smoke:services` is the only gate that proves a composition root actually ran.
The static gates verify declarations and imports; they cannot observe a port
that was never registered. It builds each account, starts it, and asks a route
that reaches **that account's own data** — health is deliberately not the probe,
because the failure it exists for leaves health at 200. It also scans the
server's output: any `is not configured` line fails the run even when every
status code is green.

The main application has the equivalent gate in `npm run smoke:production`.

See [Deployment Targets](../../07-mobile-and-release/deployment-targets.md) for what each account is asked and why.

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
4. Every deployment is a composition root. An account service has no
   `src/instrumentation.ts` from the application, so its own composition MUST
   register every port its routes reach.
5. An account composition root MUST pin a runtime choice its deployment cannot
   serve both sides of.

### Invariant 5 — a deployment pins what it cannot serve

Rule:
: Each account composition root MUST call
  `registerDataCoreRuntimeConfigPorts({ forceRemoteDataSource: true })`.

Reason:
: Every account aliases `better-sqlite3` to a stub that throws — it runs against
  Turso only. The backend is otherwise resolved from the runtime context, where
  a data source of `local` selects SQLite in any deployment that asks.

Failure prevented:
: The profiles account did exactly this during a real `deploy:all`: it loaded a
  driver it does not ship and answered 500 on every route reaching data, while
  `/api/health` stayed 200 and Vercel reported READY. One misconfigured
  environment variable reproduces it in production.

Current implementation:
: `src/features/data/data-core-runtime-config-ports.ts` accepts the pin;
  the six `packages/*-composition/src/index.ts` pass it.
  `checkIsolatedDeploymentBackendContract` fails `npm run architecture:check`
  if a composition registers the port without it.

The main application is deliberately excluded: it ships the real driver and
needs the local branch for development. Only a deployment that cannot serve both
branches pins one.
