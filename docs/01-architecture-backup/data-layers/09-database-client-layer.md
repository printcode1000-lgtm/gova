# Database Client Layer

## Role

Resolve a logical database source and expose the same typed client contract to
repositories, independent of the runtime driver.

## Location

`packages/data-core/src/core/`

| Path | Purpose |
|---|---|
| `data-source-registry.ts` | Single lazy registry for logical server sources |
| `database/sqlite-*-db-client.ts` | Development SQLite adapters |
| `database/turso-*-db-client.ts` | Production Turso adapters |
| `database/sharded-raw-database-client.ts` | Table-to-shard routing |
| `database/**/migrations` | Local schema source of truth |
| `turso/` | Low-level libSQL connection factories |

## Driver selection

| Runtime | Driver |
|---|---|
| Development server | SQLite files in `public/sync_data/sync_sqlite` |
| Production server | Turso credentials from server environment |
| Static or Capacitor client | Remote Business API; no database driver |

The registry creates a source lazily on its first operation. Importing one
repository does not open unrelated databases or require their credentials.

## Module loading

The registry imports its adapter classes with static `import` statements, and the
adapters load their drivers (`better-sqlite3`, `@libsql/client`, Drizzle) lazily
through `nodeRequire` inside the branch that needs them. Laziness therefore lives at
the driver boundary, not at the adapter boundary: a Turso runtime still never loads
the SQLite driver.

Relative specifiers must never go through `nodeRequire`. It is `createRequire`, so it
resolves at runtime against Node's CommonJS rules, and this package ships TypeScript
sources with no extension for it to resolve — `nodeRequire('./database/<client>')`
fails with `Cannot find module`, taking every data source down with it. Reserve
`nodeRequire` for package specifiers that exist in `node_modules`.

## Rules

- Only `packages/data-core/src` imports `better-sqlite3`, `@libsql/client`, or Drizzle.
- Repositories request logical sources such as `usersDataSource` and
  `profilesDataSource`.
- Features never choose SQLite, Turso, a file path, URL, or shard.
- Turso is blocked during development runtime except explicit provisioning.

See [25-central-data-access-module.md](./25-central-data-access-module.md).
