# Service Boundaries

## Purpose

Boundaries between the main application (`gova`), six service deployments, and sealed packages they compose.

## Scope

`services/notifications`, `services/orders`, `services/products`, `services/profiles`, `services/submain`, `services/sub2main`. Seven production Vercel targets including main.

## Topology

```text
Main app (gova)          Full capability set via src/core/composition/
        │
        ├── services/notifications/   ← notifications-composition
        ├── services/orders/          ← orders-composition
        ├── services/products/        ← products-composition
        ├── services/profiles/        ← profiles-composition
        ├── services/submain/         ← submain-composition
        └── services/sub2main/        ← sub2main-composition
```

Services do **not** share a Node process or memory with main or each other. Each is an independent Vercel project.

## Boundary rules

| Rule | Rationale |
|---|---|
| Import graph determines synced code | `service-mirror-core` copies only reachable sealed sources |
| Dynamic import hides edges | Prefer static imports in composition entry files |
| No cross-service imports | Services are separate repos-on-disk |
| Account declarations per door | Prevents env key leakage across accounts |
| Capability closure per account | Runtime tasks match credentials |

## Shared vs isolated

| Concern | Shared | Isolated per service |
|---|---|---|
| Sealed package source | Same `packages/` in monorepo | Generated mirror subset |
| Turso credentials | Same platform | Different DB URLs/shards |
| R2 credentials | Same platform | Different buckets/tokens |
| Env var names | From `account-declarations` | Values per deployment |
| HTTP routes | Pattern from service-runtime-core | Route set per account |

## Verification

```bash
npm run services:sync      # refresh generated/
npm run services:verify    # resolve all imports in each service
npm run services:build     # next build in each service folder
```

Part of `npm run build` and `deploy:all` preflight.

## Deployment

Full deploy orchestration: `npm run deploy:all` — see [docs/07-mobile-and-release/](../../07-mobile-and-release/).

Cloud account registry: [super-admin-cloud-accounts.md](../../06-super-admin-and-operations/super-admin-cloud-accounts.md).

## Source Map

- Services: `services/*/`
- Compositions: `packages/*-composition/`
- Mirror: `packages/service-mirror-core/`
- Declarations: `packages/account-declarations/`

## Related Documents

- [Service Composition](../04-composition/service-composition.md)
- [Application–Package Boundaries](./application-package-boundaries.md)

## Change Impact

Service boundary changes require sync, verify, build, and deploy script updates.

## Invariants

1. Six services map to six composition packages.
2. Generated mirrors MUST be reproducible from `services:sync`.
3. Services MUST NOT import undeclared capabilities for their account.
