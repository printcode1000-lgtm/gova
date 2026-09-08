> **Note:** Operational detail relocated here during the 2026-08 architecture reconstruction. Architectural relationships: [docs/01-architecture/](../01-architecture/README.md).

# Central Data Access Module — `@asol/data-core`

## Purpose

`packages/data-core` is the exclusive ownership boundary for every application
database operation. It contains runtime queries and commands, repositories,
Turso adapters, sharded database routing, schemas, migrations,
database provisioning, and browser IndexedDB primitives.

It is a **sealed package**, not a folder. Nothing outside it may import one of
its files by path; every consumer goes through a declared door in the package's
`exports` map. The full contract, the door list, and the reasoning behind the
shape live in [data-core-module.md](../05-platform-features/sealed-packages/data-core-module.md).

There is no compatibility layer at the previous `src/features/data-access`,
`src/core/database`, `src/lib/asol-db`, feature repository, or feature operation
paths. Consumers must use the package doors directly.

## Data flows

Server data follows this path:

```text
UI -> Client Service -> AsolApiClient -> Business API -> Server Service
   -> Data Access domain entry point -> Query/Command/Repository
   -> Data Source Registry -> Turso (every runtime)
```

Browser-local persistence and query state follow these paths:

```text
Client feature -> @asol/data-core/browser -> AsolDB (IndexedDB)
Client hook -> @asol/data-core/browser -> QueryClient -> memory / AsolDB queryCache
AsolApiClient browser GET -> data-core local-read gate -> memory / AsolDB queryCache -> cloud only when policy requires
Remote image cache -> @asol/data-core/browser -> AsolDB imageCache -> cloud only after local miss/staleness
```

Clients never receive database credentials and never submit SQL. Static and
Capacitor clients still use `AsolApiClient` to reach the hosted backend.

## Directory ownership

| Directory | Single responsibility |
|---|---|
| `core/data-source-registry.ts` | Resolve a logical server data source and cache its runtime client |
| `core/database/` | Turso and sharded database adapters plus schemas and migrations |
| `core/turso/` | Low-level users and advertisements libSQL clients |
| `browser/asol-db/` | Typed AsolDB stores and IndexedDB transactions |
| `browser/query/` | TanStack Query ownership, policies, provider, and durable lifecycle |
| `browser/image-cache/` | Bounded Blob-cache records and LRU persistence primitives |
| `browser/clear-browser-databases.ts` | Destructive browser database reset only |
| `browser/workers/` | Source of generated workers that transact against AsolDB |
| `domains/<domain>/queries/` | Read operations for one domain |
| `domains/<domain>/commands/` | Write operations and transactional command orchestration |
| `domains/<domain>/repositories/` | Persistence implementation for one domain |
| `domains/<domain>/ports/` | Storage contracts that keep commands independent from adapters |
| `domains/<domain>/index.server.ts` | The domain's server-only public entry point |
| `provisioning/desired-schema/` | One desired-schema manifest per logical database — the provisioning SSOT |
| `provisioning/core/` | Turso schema read-back, diff, sync, and Turso provisioning |
| `tooling/` | Database creation, migration, verification, export, and maintenance executables |

Cloudflare R2 is intentionally not part of this database module. Its clients
live under `@asol/storage-core` (`packages/storage-core`) because object
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
| `profiles` | Profile Turso shards | Matching profile Turso shards |

Marketplace orders use their typed `MarketplaceDb` port and the shared shard
router. The adapter resolves each table to its declared order shard.

### One backend, every runtime

There is no backend to select. `resolveServerDatabaseBackend` used to answer
`sqlite` whenever the runtime called itself development, so `npm run dev` served
application data from files under `public/sync_data/sync_sqlite` while every
deployed runtime served it from Turso. Development was therefore the one
environment in which a data-path bug could not reproduce.

The registry now instantiates only Turso clients, and the runtime policy answers
a narrower question: whether *this* runtime may open a server database at all.
Browser, native and static execution still cannot — they reach data through the
Business APIs — and missing credentials fail loudly at the owning client rather
than resolving to an emptier source.

The practical consequence is worth stating plainly: an ordinary create, update or
delete performed in Development affects whichever cloud environment the
configured credentials represent.

## Import rules

- Every import from outside the package uses a declared door:
  `@asol/data-core`, `/core`, `/browser`, `/telemetry`, `/provisioning`,
  `/tooling`, or `/<domain>`. A path into `src/` resolves nothing.
- UI, hooks, and client services cannot import server data-access entry points.
- Server services consume `@asol/data-core/<domain>` or a typed query or
  command. They do not import database adapters.
- Only `packages/data-core/src` may import Drizzle or
  `@libsql/client` — and `src/core/database/`, where those live, has **no door
  at all**, so the seal enforces it rather than a path pattern.
- Only `packages/data-core/src` may contain production SQL.
- Only `packages/data-core/src/browser` may call IndexedDB APIs.
- TanStack Query and its persistence package are dependency-owned by `@asol/data-core`; application code consumes the browser-safe `@asol/data-core/browser` door.
- Browser JSON reads cannot bypass the local-read cache: `AsolApiClient` delegates every browser GET to the registered data-core gate, and missing registration fails closed before transport.
- Database-backed tests that issue SQL live inside their owning domain in the
  package; tests outside it cannot issue SQL or import a driver.
- Database maintenance executables live in `src/tooling`; `scripts/`
  may orchestrate them but cannot contain SQL or open a database.
- Cross-shard SQL is rejected by the shard router.
- Browser code cannot reach a database client and cannot access server secrets.
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
5. Add a desired-schema manifest, provisioning credentials, and schema synchronization.
6. Run `npm run typecheck`, `npm run architecture:check`, and the domain tests.

## Domain entity ownership

Row/entity contracts used by repositories (profile contacts, store details, specialties,
fulfillment, reviews, auth user/profile, product reviews, follow, seller discounts, pharmacy
catalog overrides, product-search request/result types, and profile working hours) are owned under
each domain's browser-safe `./<domain>/entities` door. Application feature entity files re-export
from those doors.
