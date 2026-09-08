# Schema & Provisioning

## Purpose

Preserved operational and architectural detail, relocated here during the 2026-08 architecture reconstruction. Agents use this for implementation guidance.

## Scope

See sections below. Architectural relationships defer to [docs/01-architecture/README.md](../01-architecture/README.md) where applicable.

---

Used **only during build, deployment, and CI** — never at application runtime.

**Location:** `packages/data-core/src/provisioning/`

| Module | Role |
|--------|------|
| `desired-schema/*.ts` | One desired-schema manifest per logical database |
| `desired-schema/registry.ts` | Label → manifest map; throws if a declared shard has none |
| `core/turso-schema-reader.ts` | Read the live schema from Turso (read-only) |
| `core/schema-diff.ts` | Additive DDL, plus what additive DDL cannot repair |
| `core/schema-sync.ts` | Verify or apply, write reports |
| `core/schema-version.ts` | SHA-256 schema fingerprint |
| `core/schema-credentials.ts` | Which env keys hold each database's credentials |
| `core/turso-platform-api.ts` | Turso Platform API (`TURSO_API_TOKEN`) |
| `core/turso-provisioner.ts` | Create Turso DBs + tokens |

## Desired-schema manifests — the schema SSOT

```text
packages/data-core/src/provisioning/desired-schema/
```

One TypeScript manifest per logical database — 21 of them, matching the four
standalone databases and the seventeen shards. Each describes the final intended
schema of its database: tables, columns, normalized CREATE SQL, primary-key
ordinals, defaults, foreign keys, uniqueness (including inline `UNIQUE`
constraints that have no DDL of their own), CHECK constraints, `AUTOINCREMENT`,
indexes with their partial-index predicates, views, and triggers.

They are ordinary source. Loading one opens no file and starts no database
engine, which is what lets a build validate release schema with no credentials
and no `.db` file anywhere.

Two other representations exist and are **not** the SSOT:

- Drizzle `sqliteTable(...)` declarations are the application's data mapping.
  Turso speaks the SQLite dialect, so these stay exactly as they are.
- Historical migrations under `.../migrations/` are history. They contain
  dropped, renamed and intermediate tables, so replaying or concatenating them
  does not describe the schema the databases have now.

A parity test (`packages/data-core/src/tests/schema-parity.test.ts`) keeps the
three from drifting apart.

## What schema sync does

```
desired manifest  →  Schema Diff  →  Turso DB (paired)
                    (additive DDL only)
```

Supported: `CREATE TABLE`, `ADD COLUMN`, `CREATE INDEX`, `CREATE VIEW`, `CREATE TRIGGER`.

**Never:** INSERT, UPDATE, DELETE, or row migration. Provisioning creates and
describes; it never destroys or reseeds.

A difference additive DDL cannot repair — a changed primary key, foreign key,
CHECK constraint, uniqueness, default, type or nullability on a table that
already exists — is reported as a **migration requirement** and fails the run.
SQLite can only fix those by rebuilding the table and moving its rows, which is a
migration a person writes and reviews.

Extra objects Turso has and the manifests do not are warnings, not drops. Exact
cleanup is never the default: historical tables from removed capabilities live in
production databases, and a code refactor is not authorization to destroy cloud
data.

Temporal columns ending in `_at` treat `TEXT` and `DATETIME` as compatible
because the application stores ISO timestamp strings. Column defaults are
compared after normalizing quoting, case, and the two boolean spellings, so a
re-quoted default is not reported as drift and a genuinely different one is.

## Reports

| File | Database |
|------|----------|
| `public/sync_data/schema-sync-report.json` | Users |
| `public/sync_data/*-schema-sync-report.json` | Every other logical database |

Viewable in Operation Monitor **Schema Sync** tab.

## Scripts

```bash
npm run db:schema:verify       # Read-only: compare manifests with Turso, send no DDL
npm run db:schema:sync         # Apply additive DDL to the configured databases
npm run db:schema:sync:release # Same, with credentials required rather than skipped
npm run db:provision:turso     # Create Turso DBs + tokens, then apply desired schema
npm run db:verify:turso        # Read-only shard schema verification
npm run db:push:vercel-env     # Push Turso vars to Vercel
```

`npm run build` runs `db:schema:verify` only. A generic build proves the code is
consistent with the schema it expects; it must never be the thing that changes a
cloud database. Applying DDL belongs to the `deploy:all` release preflight.

## Migration pipeline (users)

1. `drizzle.config.ts` → `packages/data-core/src/core/database/schema.ts`
2. Output: `packages/data-core/src/core/database/migrations/`
3. Generate: `npm run db:drizzle -- generate`
4. Update the matching desired-schema manifest, then apply with
   `db:schema:sync:release`

The three root Drizzle config files export plain configuration objects and do
not import `drizzle-kit`. The `db:drizzle` runner installs CLI `0.31.10` without
saving it or changing the lockfile, executes the requested command, and always
prunes the temporary tool afterward. This keeps the schema CLI out of the
application dependency graph and allows the normal TypeScript check and full
dependency audit to run without it installed.

## Runtime is never a schema authority

Application repositories are data-only. `system_logs`, `control_release_state`,
`seller_discounts` and `seller_discount_usages` used to be created by the
repositories that read them, on first use, forever — a second definition of each
table, where whichever ran first decided what production got. They are declared
in their manifests now.

Row transformations that a schema cannot express stay separate and explicit. The
one that exists is `npm run db:migrate:system-log-origin`, which marks
pre-classification server-side log rows as cloud-origin; it is idempotent and
runs when someone runs it, not on every write.

## Example DDL sync

Manifest change:

```sql
ALTER TABLE users ADD COLUMN avatar TEXT;
```

Only that statement runs on Turso — no full table recreate.

## CI / Vercel

On Vercel (`VERCEL=1`), missing Turso credentials **fail** the run (not skipped).
Missing configuration is never converted into a comparison against something
local: there is nothing local. See
[environment-variables.md](./environment-variables.md).
