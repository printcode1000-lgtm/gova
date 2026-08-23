# Database Client Layer

## Purpose

Lowest application data layer — connection management, shard routing, driver invocation for SQLite and Turso.

## Scope

Inside `@asol/data-core` only (`packages/data-core/src/core/database/**`, provisioning, tooling doors). Not duplicated in application.

## Responsibilities

- Construct database connections per runtime context
- Shard routing and retry policy
- Reject DB construction in browser/static/native client paths
- Expose client to repositories

## May import

- `better-sqlite3`, `@libsql/client`, `drizzle-orm` (registered vendor owner)
- Provisioning config from `@asol/data-core/provisioning`
- Runtime policy modules

## Must never import

- UI, hooks, any client bundle entry
- Application features directly (use domain doors)

## Doors

| Door | Use |
|---|---|
| `@asol/data-core` | General server entry |
| `@asol/data-core/browser` | IndexedDB / AsolDB client adapter |
| `@asol/data-core/provisioning` | Schema provisioning, Turso setup |
| `@asol/data-core/tooling` | CLI maintenance scripts |
| `@asol/data-core/telemetry` | Query telemetry to observability |

33 total export doors — see [package-exports.md](../02-packages/package-exports.md).

## Runtime isolation

`test:runtime-context` and database runtime policy tests enforce: no DB client in static export, Android, iOS, or browser bundles except via `./browser` adapter.

## Operational procedures

Schema changes, Turso sync, migrations: [docs/02-data-and-storage/](../../02-data-and-storage/).

Backup reference: `docs/01-architecture-backup/data-layers/09-database-client-layer.md`, `11-current-databases.md`.

## Source Map

- Core: `packages/data-core/src/core/database/`
- Policy test: `packages/data-core/src/core/database-runtime-policy.test.ts`
- ESLint driver ban outside data-core

## Related Documents

- [Repository Layer](./repository-layer.md)
- [Infrastructure Ownership](../05-capability-enforcement/infrastructure-ownership.md)

## Change Impact

Any second database client owner violates mandatory gateway — rejected by scan.

## Invariants

1. `@asol/data-core` is the sole database driver owner.
2. Scripts MUST use tooling/provisioning doors, not inline drivers.
3. Browser persistence uses `./browser`, not Turso drivers.
