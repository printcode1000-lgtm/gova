# Database Client Layer

## Role

Select the **driver** (SQLite dev / Turso prod) and expose Drizzle `db` to Repository.

## Location

`src/core/database/`

| File | Purpose |
|------|---------|
| `db-client.ts` | Users singleton |
| `profile-db-client.ts` | Profile singleton |
| `sqlite-*-db-client.ts` | `better-sqlite3` + migrations |
| `turso-*-db-client.ts` | `@libsql/client` |
| `ensure-*-migrations.ts` | Drizzle migrate on first dev connection |

## Driver selection

| Environment | Driver | Local file |
|-------------|--------|------------|
| `npm run dev` | SQLite | `public/sync_data/sync_sqlite/*.db` |
| Production server | Turso | env vars |

Turso is **blocked** during dev runtime except when `GOVA_PROVISIONING=true` (build scripts).

Dev detection:

```typescript
GOVA_MODE === 'development'
|| NEXT_PUBLIC_GOVA_MODE === 'development'
|| NODE_ENV === 'development'
```

## Rule

**Database Client is the only layer** that touches `better-sqlite3` and `@libsql/client`.

## Adding a new project database

1. SQLite file + schema + migrations + `drizzle.*.config.ts`
2. Dedicated `*DbClient`
3. Dedicated Turso env vars
4. Separate schema sync (one SQLite file → one Turso DB)

See [20-schema-provisioning.md](./20-schema-provisioning.md) and [11-current-databases.md](./11-current-databases.md).
