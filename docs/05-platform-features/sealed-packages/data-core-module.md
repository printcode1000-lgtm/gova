# `@asol/data-core`

Every database in this project, and every piece of code that talks to one, lives in a single
sealed package at `packages/data-core/`. It is the largest package in the repository: 197
production files across 18 domains, plus the drivers, the schemas, the migrations, the shard
router, the provisioning engine, the maintenance executables, and the browser IndexedDB layer.

It is held to [the eight module isolation rules](../../01-architecture/02-packages/module-isolation-rules.md). Quote them by
number when changing anything here.

## What moved, and what did not

The whole of `src/features/data-access/` moved, with its directory structure preserved:

```text
src/features/data-access/core        -> packages/data-core/src/core
src/features/data-access/domains     -> packages/data-core/src/domains
src/features/data-access/browser     -> packages/data-core/src/browser
src/features/data-access/provisioning-> packages/data-core/src/provisioning
src/features/data-access/tooling     -> packages/data-core/src/tooling
```

**Turso accounts did not move, and nothing about them changed.** Shard resolution still yields
a shard name (`orders-core`, `profile-contact`, `system-ops`) from which the client derives its
`*_DATABASE_URL` / `*_DATABASE_AUTH_TOKEN` pair and reads it at runtime. The package holds code,
never a credential. Which account owns which shard is declared by
`@asol/account-declarations/<account>` and enforced by the environment-variable panels on each
Vercel project — a different layer entirely, untouched by this migration.

## The doors

The door count is evidence of how many distinct load-time contracts this package
has rather than a lapse in rule 2. Every one is in the `exports` map that `architecture:check`
reads; there is no `"./*"` wildcard, and no `"@asol/data-core/*"` path in `tsconfig.json` — that
single wildcard silently defeated the `native-core` seal once and must never reappear.

| Door | Contents | Layer it classifies as |
| :-- | :-- | :-- |
| `.` | Module identity and the server database backend policy. Browser-safe. | `shared` |
| `./telemetry` | The telemetry port and its registration function. | `shared` |
| `./core` | The data source registry and `IDatabaseClient`. | `database-client` |
| `./browser` | AsolDB (IndexedDB) stores, the query persister, the reset helper. | `shared` |
| `./provisioning` | Schema inspection, diff, sync, Turso provisioning, shard identity. | `provisioning` |
| `./tooling` | Maintenance executables that spawn processes and touch the filesystem. | `provisioning` |
| `./<domain>` × 18 | One door per domain, each pointing at that domain's `index.server.ts`. | `operations` (`marketplace-orders` → `server-services`) |

### `src/core/database/` has no door

This is the part worth keeping. `drizzle-orm`, `better-sqlite3`, and `@libsql/client` are
imported only inside that folder, and **no entry in the `exports` map leads to it**. Turso
adapters load through `drizzle-libsql.server.ts` (a static `drizzle-orm/libsql` import) so
Next.js file tracing ships the adapter on Vercel; lazy `nodeRequire('drizzle-orm/libsql')`
left production with `Cannot find module 'drizzle-orm/libsql/index.cjs'`. Every deployment
must also list `drizzle-orm` in `serverExternalPackages` and include
`node_modules/drizzle-orm/libsql/**/*` in `outputFileTracingIncludes`. Before the
migration the same guarantee was three regular expressions in
`packages/architecture-core/src/contracts/contract.ts` matching a folder path; a file that moved out of the folder
lost the protection silently. Now the resolver enforces it: an import of a driver from anywhere
else resolves nothing, and the contract test asserts that no door target contains
`/src/core/database/`.

The three lists in `contract.ts` still exist, now pointing at `^packages/data-core/src/`, and
they still catch a driver import written *inside* the package but outside its database folder.

### One door per domain, and never a barrel

The root door must not re-export a domain, and the contract test fails if it does. A barrel
would mirror every domain's schema into any deployment that imports it — the exact failure
already recorded for the `account-declarations` barrel, which put the products account's
`PRODUCT_R2_*` key names inside the orders deployment. Per-domain doors keep the service mirror
honest: `packages/service-mirror-core` walks the import graph file by file, so the orders
deployment receives the order domain and nothing else. Its mirror was verified after the
migration and contains no profile, product, or notification schema.

## Rule 7 runs both ways

The package must not know the application. Two shapes of edge existed, and they were treated
differently.

**Inverted — the developer monitor.** Nineteen imports of `@/core/monitor/*` are gone. The
package now declares `src/ports/telemetry.ts` and announces work through it; the application
registers an implementation in `packages/observability-core/src/monitor/data-core-telemetry.ts` (shared) and
`data-core-telemetry.server.ts` (the `server-only` half). Those two files are the seam and the
only modules allowed to know both sides. Registration happens in `src/instrumentation.ts` on the
server and at module scope in the query provider in the browser.

Every port method is a **wrapper**, never "build this event and hand it over": the package
passes a descriptor plus the action, so the monitor's event shape, its session and flow
identifiers, and its memory sampling stay entirely on the application's side.

**Every default is safe**, and the contract test asserts it rather than trusting it: with
nothing registered, a query still runs, an IndexedDB read still runs, a server-layer call still
returns its value, the drizzle logger is absent rather than a stub, and a failure still
propagates. A forgotten registration costs trace lines in `/dev/monitor` — never a query, never
a write.

**Budgeted — remaining app edges**, pinned in `packages/data-core/src/tests/index.test.ts`.
The budget is now **empty**: runtime config, HTTP, category specialty columns, and the
product-search field catalog are registered through `src/ports/runtime-config.ts` and
`src/ports/product-search-fields.ts`. The advertisements reset tool loads its seed JSON by
filesystem path under `src/features/advertisements/config/` (no `@/` import). Database
runtime policy uses a local `DatabaseRuntimeContext` shape instead of importing
`AppRuntimeContext` from the app.

Driving the count to zero was the direction of this list; **it should only ever stay empty
or shrink**, and the test fails when a new `@/` edge appears.

## Package-to-package edges

`@asol/data-core` imports `@asol/dev-core` (local database paths), `@asol/storage-core` (public
URL building), `@asol/system-logs-core/server`, `@asol/product-core`, `@asol/data-health-core`
(cleanup vocabulary/policy), and `@asol/backup-core` (archive contract). Three packages now
import a `data-core` door instead of an application path, and each pins it in its own contract
test as a **package door** rather than an app edge:

| Package | Door |
| :-- | :-- |
| `@asol/notifications-core` | `./notifications` |
| `@asol/ota-core` | `./browser`, `./ota` |
| `@asol/orders-composition` | `./marketplace-orders` |

In the other direction `data-core` imports [`@asol/orders-core`](./orders-core-module.md) for the
order vocabulary its repositories speak — the eight application edges that used to carry it are
gone, which is what took the budget from 41 to 34.

`ota-core`'s app-edge budget dropped from 5 to 3 as a result: two of its five declared edges
were data-access paths and are now package doors.

## Local schema and cloud schema cannot diverge

The design source of truth is local: the SQLite files and the migrations that build them.
Turso's schema is *derived* from them by `db:schema:sync:release`, which `deploy:all` runs in
preflight before any build, push, or git write. Four things make a gap between the two
impossible rather than unlikely, and each closes a different way it could open.

**1. The release refuses to skip.** `ASOL_SCHEMA_SYNC_REQUIRED=true` (set by
`db:schema:sync:release`, and implied by `CI` and `VERCEL`) turns a missing credential from a
silent skip into a failure that names every database it could not reach. A partially configured
environment cannot produce a green release.

**2. Shard coverage is derived, never listed.** `runAllSchemaSyncs` iterates
`DATABASE_SHARD_NAMES`, so a shard is synced the moment it is declared. The four standalone
databases are hand-listed, and the parity test fails if one of them is routed but not synced.

**3. The sync verifies its own result.** After applying the DDL it re-reads the Turso schema and
re-runs the diff. Any remaining operation fails the release with the list. This closes the real
hole: `operations` was computed against the schema *before* the writes, so it could only ever
report intent — and the `already exists` branch deliberately swallows a failure. "The DDL was
sent" and "the cloud matches" are different claims, and only the second one is now asserted.

**4. The offline half runs on every build.** `packages/data-core/src/tests/schema-parity.test.ts`
checks what needs no network: every table a shard claims is created by a migration, no table is
claimed by two shards, the table→shard lookup agrees with the shard map it derives from, and no
two shards resolve to the same `*_DATABASE_URL` prefix. Every drift the live sync could discover
starts in these files, because the cloud schema is produced from them.

Deliberately **not** duplicated: the live comparison happens once, in `deploy:all`. Running it a
second time inside a test chain would either apply DDL twice or make a green build depend on a
live database and a credential — the "local green is not CI green" failure this repository has
already paid for three times.

`npm run db:verify:sqlite` and `npm run db:verify:turso` expose the two read-only shard
verifiers for manual inspection. They were unreachable executables before this migration; they
are not in any chain, because the sync above is the authority.

## The gate

`npm run test:data-core` runs `packages/data-core/src/tests/index.test.ts` and is wired into the
`build`, `build:static`, and `test` chains. The test itself asserts that wiring, because rule 3
has been missed three times in this repository by writing a test that gated nothing.

It pins: the exact door set, the absence of a wildcard door, that every door target exists, that
every domain has a door, that the root door is not a barrel, that no door reaches
`src/core/database`, that the browser door's transitive closure touches no `node:*` builtin and
no server driver, that every telemetry default is safe, and the app-edge budget in both
directions.

## Changing this package

1. Read this file and [25-central-data-access-module.md](../../02-data-and-storage/central-data-access.md).
2. Adding a domain means adding a door — `exports`, `tsconfig.json` paths, and the pinned list
   in the contract test, deliberately and in the same change.
3. Never add a `"./*"` door, and never add a `"@asol/data-core/*"` path wildcard.
4. Never re-export a domain from the root door.
5. Run `npm run architecture:check`, `npm run test:data-core`, and `npm run services:sync`. The
   last one matters: a broken graph shows up as a missing mirror entry, not as a type error.
