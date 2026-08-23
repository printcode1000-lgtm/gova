# Schema & Provisioning

## Purpose

Preserved operational and architectural detail from `docs/01-architecture-backup/`. Agents use this for implementation guidance.

## Scope

See sections below. Architectural relationships defer to [docs/01-architecture/README.md](../README.md) where applicable.

---

Used **only during build, deployment, and CI** — never at application runtime.

**Location:** `packages/data-core/src/provisioning/core/`

| Module | Role |
|--------|------|
| `sqlite-schema-reader.ts` | Read schema from a SQLite file |
| `turso-schema-reader.ts` | Read schema from Turso |
| `schema-diff.ts` | Minimal DDL to match SQLite |
| `schema-sync.ts` | Execute sync, write reports |
| `schema-version.ts` | SHA-256 schema fingerprint |
| `turso-platform-api.ts` | Turso Platform API (`TURSO_API_TOKEN`) |
| `turso-provisioner.ts` | Create Turso DBs + tokens |

## SQLite — schema SSOT

All schema design on files in:

```text
public/sync_data/sync_sqlite/
```

During dev, **all** CRUD runs on SQLite only. Turso is never contacted at dev runtime.

Workflow:

1. Edit schema file(s)
2. `npm run db:drizzle -- generate` (or add `--config drizzle.profile.config.ts`)
3. Migrations apply on first API request in dev (`ensureDevMigrations`)
4. `npm run build` runs schema sync → Turso

## What schema sync does

```
SQLite file  →  Schema Diff  →  Turso DB (paired)
               (incremental DDL only)
```

Supported: `CREATE TABLE`, `ADD COLUMN`, `CREATE INDEX`, `CREATE VIEW`, `CREATE TRIGGER`.

**Never:** INSERT, UPDATE, DELETE, or row migration.

Each SQLite file syncs to **its own** Turso database. Profile and order data sync through the 17 shard files rather than the old monolithic source files.

Schema diff suppresses known cross-database tables when a deployment uses a shared/fallback Turso database URL. For example, product tables in the users Turso URL are not reported as users warnings when they are known logical product tables.

Temporal columns ending in `_at` treat SQLite `TEXT` and Turso `DATETIME` as compatible because the application stores ISO timestamp strings.

## Reports

| File | Database |
|------|----------|
| `public/sync_data/schema-sync-report.json` | Users |
| `public/sync_data/*-schema-sync-report.json` | Product, advertisements, and profile/order shards |

Viewable in Operation Monitor **Schema Sync** tab.

## Scripts

```bash
npm run db:ensure              # Create source DBs and refresh all profile/order shards
npm run db:schema:sync         # Sync SQLite databases and shards to Turso
npm run db:provision:turso     # Create Turso DBs matching local SQLite names + sync
npm run db:create:sqlite       # Reset allusers.db from migrations
npm run db:push:vercel-env     # Push Turso vars to Vercel
```

Schema sync runs automatically in `npm run build`.

## Migration pipeline (users)

1. `drizzle.config.ts` → `packages/data-core/src/core/database/schema.ts`
2. Output: `packages/data-core/src/core/database/migrations/`
3. Generate: `npm run db:drizzle -- generate`

The three root Drizzle config files export plain configuration objects and do
not import `drizzle-kit`. The `db:drizzle` runner installs CLI `0.31.10` without
saving it or changing the lockfile, executes the requested command, and always
prunes the temporary tool afterward. This keeps the schema CLI out of the
application dependency graph and allows the normal TypeScript check and full
dependency audit to run without it installed.
4. Apply (dev): `ensureDevMigrations()` on first connection

## Migration pipeline (profile/order shards)

1. Profile source migrations live in `packages/data-core/src/core/database/profile/migrations/`
2. Order source migration lives in `packages/data-core/src/domains/marketplace-orders/db/migrations/`
3. `npm run db:ensure` creates source SQLite files and refreshes the 17 runtime shards
4. Runtime clients read/write the shard files directly

## Example DDL sync

Local change:

```sql
ALTER TABLE users ADD COLUMN avatar TEXT;
```

Only that statement runs on Turso — no full table recreate.

## CI / Vercel

On Vercel (`VERCEL=1`), missing Turso credentials **fail** the build (not skipped). Ensure all four runtime vars are set — see [environment-variables.md](../../02-data-and-storage/environment-variables.md).
