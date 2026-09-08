# Database Schema Compatibility

The **desired-schema manifests** under
`packages/data-core/src/provisioning/desired-schema/` are the schema source of
truth for their matching Turso databases. There is no local database: a manifest
is TypeScript this repository already contains, so the intended schema can be
read in a build with no credentials and no `.db` file.

## Database Pairs

| Desired-schema manifest | Turso environment variables |
| --- | --- |
| `users.ts` | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| `product.ts` | `TURSO_PRODUCT_DATABASE_URL`, `TURSO_PRODUCT_AUTH_TOKEN` |
| `advertisements.ts` | `TURSO_ADVERTISEMENTS_DATABASE_URL`, `TURSO_ADVERTISEMENTS_AUTH_TOKEN` |
| `notifications.ts` | `TURSO_NOTIFICATIONS_DATABASE_URL`, `TURSO_NOTIFICATIONS_AUTH_TOKEN` |
| the seventeen shard manifests | `<SHARD>_DATABASE_URL`, `<SHARD>_DATABASE_AUTH_TOKEN` |

Product, advertisements, notifications and every profile/order shard must stay
dedicated. Keeping them separate prevents unrelated tables from appearing in the
wrong cloud schema.

## Read-only verification

```bash
npm run db:schema:verify
```

Compares each manifest with its Turso database and reports what is missing. It
sends no DDL, so it is safe against production and is what `npm run build` runs.
A generic build proves the code is consistent with the schema it expects; it must
never be the thing that changes a cloud database.

## Applying the schema

```bash
npm run db:schema:sync
```

Creates missing tables, columns, indexes, views, and triggers in Turso from the
desired manifests. It does not copy row data. After applying, it re-reads Turso
and re-diffs: a difference that survives the write fails the run rather than
reporting success over a drifted cloud schema.

A difference additive DDL **cannot** repair — a changed primary key, foreign key,
CHECK constraint, uniqueness, default, type or nullability on an existing table —
is reported as a migration requirement and fails the run. SQLite can only fix
those by rebuilding the table and moving its rows, which is a migration a person
writes and reviews.

### Release schema sync (`deploy:all` preflight)

```bash
npm run db:schema:sync:release
```

Same as `db:schema:sync`, but Turso credentials are **required** for every
database. Any skipped database aborts with a non-zero exit code, and a missing
credential is never converted into a comparison against something local.

`deploy:all` runs the cloud-schema readiness branch and then
`db:schema:sync:release` after `npm test` and before `build:static`, so
production DDL is brought in line with the working tree before any release commit
is created.

## Exact Schema Cleanup

```bash
ASOL_SCHEMA_SYNC_EXACT=true npm run db:schema:sync
```

Never the default. It keeps the same additive behavior and *also* drops Turso
objects the manifests do not declare. Historical tables from removed
capabilities live in production databases — the eight `data_health_*` tables are
the current example — and a code refactor is not authorization to destroy cloud
data. Use this only after confirming that every extra object is genuinely
unwanted and that each Turso database is dedicated to its own manifest.

## Provisioning

```bash
npm run db:provision:turso
```

Creates or reuses users/product/advertisements/notifications plus all 17 profile
and order shards, writes their runtime credentials, and applies the desired
schema additively.

Provisioning creates and describes. It never drops a table, never deletes rows,
and never copies rows from anywhere — an existing database keeps everything it
has.
