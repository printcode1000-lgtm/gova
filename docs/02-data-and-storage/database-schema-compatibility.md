# Database Schema Compatibility

The local SQLite files in `public/sync_data/sync_sqlite` are the schema source
of truth for their matching Turso databases.

## Database Pairs

| Local SQLite | Turso environment variables |
| --- | --- |
| `allusers.db` | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| `profile.db` | `TURSO_PROFILE_DATABASE_URL`, `TURSO_PROFILE_AUTH_TOKEN` |
| `product.db` | `TURSO_PRODUCT_DATABASE_URL`, `TURSO_PRODUCT_AUTH_TOKEN` |
| `advertisements.db` | `TURSO_ADVERTISEMENTS_DATABASE_URL`, `TURSO_ADVERTISEMENTS_AUTH_TOKEN` |
| `marketplace-orders.db` | `MARKETPLACE_ORDERS_DATABASE_URL`, `MARKETPLACE_ORDERS_DATABASE_AUTH_TOKEN` |

Product and advertisements databases must not fall back to the users database.
Keeping them dedicated prevents unrelated tables from appearing in the wrong
cloud schema.

## Normal Schema Sync

```bash
npm run db:schema:sync
```

This creates missing tables, columns, indexes, views, and triggers in Turso from
the local SQLite schema. It does not copy row data.

## Exact Schema Cleanup

```bash
ASOL_SCHEMA_SYNC_EXACT=true npm run db:schema:sync
```

This keeps the same additive behavior and also removes extra Turso objects that
do not exist in the matching local SQLite schema. Use it only after confirming
that each Turso database is dedicated to its matching local SQLite file.

## Provisioning

```bash
npm run db:provision:turso
```

Provisioning creates or reuses all five dedicated Turso databases, writes their
runtime credentials, and then runs schema synchronization with exact cleanup
enabled.
