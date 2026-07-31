# Central Data Access Module

## Purpose

`src/modules/data-access` is the exclusive ownership boundary for every
application database operation. It contains runtime queries and commands,
repositories, SQLite and Turso adapters, sharded database routing, schemas,
migrations, database provisioning, and browser IndexedDB primitives.

There is no compatibility layer at the previous `src/core/database`,
`src/lib/asol-db`, feature repository, or feature operation paths. Consumers
must use the new module directly.

## Data flows

Server data follows this path:

```text
UI -> Client Service -> AsolApiClient -> Business API -> Server Service
   -> Data Access domain entry point -> Query/Command/Repository
   -> Data Source Registry -> SQLite (development) | Turso (production)
```

Browser-local data follows this path:

```text
Client feature -> @/modules/data-access/browser -> AsolDB (IndexedDB)
```

Clients never receive database credentials and never submit SQL. Static and
Capacitor clients still use `AsolApiClient` to reach the hosted backend.

## Directory ownership

| Directory | Single responsibility |
|---|---|
| `core/data-source-registry.ts` | Resolve a logical server data source and cache its runtime client |
| `core/database/` | SQLite, Turso, and sharded database adapters plus schemas and migrations |
| `core/turso/` | Low-level users and advertisements libSQL clients |
| `browser/asol-db/` | Typed AsolDB stores and IndexedDB transactions |
| `browser/clear-browser-databases.ts` | Destructive browser database reset only |
| `browser/workers/` | Source of generated workers that transact against AsolDB |
| `domains/<domain>/queries/` | Read operations for one domain |
| `domains/<domain>/commands/` | Write operations and transactional command orchestration |
| `domains/<domain>/repositories/` | Persistence implementation for one domain |
| `domains/<domain>/ports/` | Storage contracts that keep commands independent from adapters |
| `domains/<domain>/index.server.ts` | The domain's server-only public entry point |
| `provisioning/core/` | SQLite-to-Turso schema inspection, diff, sync, and Turso provisioning |
| `tooling/` | Database creation, migration, verification, export, and maintenance executables |

Cloudflare R2 is intentionally not part of this database module. Its clients
remain under `src/core/provisioning` and `src/core/storage` because object
storage has a separate lifecycle and contract.

## Runtime source registry

`data-source-registry.ts` is the only runtime selector for the main server
databases. It delegates environment detection to `core/config/runtime-context`
and refuses server database access in browser, static-export, Android, and iOS
runtimes. Repositories request one of these logical sources:

| Logical source | Development | Production |
|---|---|---|
| `users` | `allusers.db` | Users Turso database |
| `products` | `product.db` | Products Turso database |
| `advertisements` | `advertisements.db` | Advertisements Turso database |
| `profiles` | Profile SQLite shards | Matching profile Turso shards |

Marketplace orders use their typed `MarketplaceDb` port and the shared shard
router. The adapter resolves each table to its declared order shard.

## Import rules

- UI, hooks, and client services cannot import server data-access entry points.
- Server services consume `domains/<domain>/index.server.ts` or a typed query or
  command. They do not import database adapters.
- Only `src/modules/data-access` may import Drizzle, `better-sqlite3`, or
  `@libsql/client`.
- Only `src/modules/data-access` may contain production SQL.
- Only `src/modules/data-access/browser` may call IndexedDB APIs.
- Database-backed tests that issue SQL live inside their owning data-access
  domain; tests outside the module cannot issue SQL or import a driver.
- Database maintenance executables live in `data-access/tooling`; `scripts/`
  may orchestrate them but cannot contain SQL or open a database.
- Cross-shard SQL is rejected by the shard router.
- Browser code cannot choose SQLite or Turso and cannot access server secrets.
- Public `asol-push-sw.js` is generated from
  `browser/workers/asol-push-sw.js`; the architecture check rejects drift.

These rules are enforced while editing by ESLint, during every build by
`npm run architecture:check`, and at runtime by the server database environment
guard. The architecture scanner covers `src/`, `scripts/`, and generated
browser persistence artifacts.

## Adding a query

1. Add one query file under `domains/<domain>/queries`.
2. Define its typed input and output without exposing database rows to UI code.
3. Use the domain repository or a narrow port.
4. Export the operation from the domain `index.server.ts` when a server service
   needs it.
5. Add focused tests for the query and its shard selection.

## Adding a command

1. Add one command file under `domains/<domain>/commands`.
2. Validate business input before writing.
3. Keep SQL and persistence mapping in the repository when the command only
   coordinates business behavior.
4. Use a typed port for transactions that need a specialized store.
5. Export only the command's public contract from `index.server.ts`.

## Adding a database

1. Add its schema, migrations, and adapters under `core/database`.
2. Add the logical source to `ServerDataSourceName`.
3. Add its environment selection to `DataSourceRegistry.create`.
4. Register shard table mappings when the database is sharded.
5. Add provisioning credentials and SQLite-to-Turso schema synchronization.
6. Run `npm run typecheck`, `npm run architecture:check`, and the domain tests.
