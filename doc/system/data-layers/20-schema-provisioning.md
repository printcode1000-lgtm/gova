# Schema & Provisioning

Used **only during build, deployment, and CI** — never at application runtime.

**Location:** `src/core/provisioning/`

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
2. `npx drizzle-kit generate` (or `--config drizzle.profile.config.ts`)
3. Migrations apply on first API request in dev (`ensureDevMigrations`)
4. `npm run build` runs schema sync → Turso

## What schema sync does

```
SQLite file  →  Schema Diff  →  Turso DB (paired)
               (incremental DDL only)
```

Supported: `CREATE TABLE`, `ADD COLUMN`, `CREATE INDEX`, `CREATE VIEW`, `CREATE TRIGGER`.

**Never:** INSERT, UPDATE, DELETE, or row migration.

Each SQLite file syncs to **its own** Turso database (`allusers.db` → users Turso, `profile.db` → profile Turso).

## Reports

| File | Database |
|------|----------|
| `public/sync_data/schema-sync-report.json` | Users |
| `public/sync_data/profile-schema-sync-report.json` | Profile |

Viewable in Operation Monitor **Schema Sync** tab.

## Scripts

```bash
npm run db:ensure              # Create missing .db files
npm run db:schema:sync         # Sync both SQLite → Turso
npm run db:provision:turso     # Create gova-db + gova-profile + sync
npm run db:create:sqlite       # Reset allusers.db from migrations
npm run db:create:profile      # Create profile.db
npm run db:push:vercel-env     # Push Turso vars to Vercel
```

Schema sync runs automatically in `npm run build`.

## Migration pipeline (users)

1. `drizzle.config.ts` → `src/core/database/schema.ts`
2. Output: `src/core/database/migrations/`
3. Generate: `npx drizzle-kit generate`
4. Apply (dev): `ensureDevMigrations()` on first connection

## Migration pipeline (profile)

1. `drizzle.profile.config.ts` → `src/core/database/profile/profile.schema.ts`
2. Output: `src/core/database/profile/migrations/`
3. Generate: `npx drizzle-kit generate --config drizzle.profile.config.ts`
4. Apply (dev): `ensureProfileDevMigrations()` on first profile connection

## Example DDL sync

Local change:

```sql
ALTER TABLE users ADD COLUMN avatar TEXT;
```

Only that statement runs on Turso — no full table recreate.

## CI / Vercel

On Vercel (`VERCEL=1`), missing Turso credentials **fail** the build (not skipped). Ensure all four runtime vars are set — see [14-environment-variables.md](./14-environment-variables.md).
