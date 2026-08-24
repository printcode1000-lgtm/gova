# Data and Storage Domain

## Purpose

Operational and behavioral documentation for persistence, database access, schemas, caching, object/image storage, profiles, and data-related environment configuration.

## Read First

- [Central Data Access](./central-data-access.md) — application-to-database access model.
- [Current Databases](./current-databases.md) — active database topology.
- [Environment Variables](./environment-variables.md) — environment key contracts; never store values in docs.
- [Schema Provisioning](./schema-provisioning.md) and [Database Schema Compatibility](./database-schema-compatibility.md) — schema lifecycle.
- `image-storage/` — object/image persistence details.

## Mandatory Owners and Gateways

Database/Turso/SQLite access belongs to `@asol/data-core`. Object storage belongs to `@asol/storage-core`; higher-level image lifecycle belongs to its declared capability packages/ports. Page-originated writes also obey `@asol/page-save-core` when the page-save contract applies.

Never bypass these owners from UI, routes, scripts, or services. Confirm the current ownership in `docs/01-architecture/08-reference/capability-map.md`.

## Change Impact

A persistence change can affect schemas, migrations/provisioning, browser/server runtime separation, service deployments, tests, backup/data-health flows, and release environment requirements. Run a context pack for the exact table/domain/path before editing:

```bash
npx tsx scripts/docs/context.ts packages/data-core/src/domains/<domain>
```
