# `@asol/data-core` Decomposition — Execution Plan

**Status:** proposal, not yet authorized for execution.
**Mode:** single atomic change. No phases, no compatibility layer, no aliases, no deprecated
re-exports, no transitional doors. The repository is on the old shape before the commit and on
the new shape after it.

---

## 1. Measured starting state

All figures measured from the working tree, not estimated.

| Area | Files | LOC | Runtime it belongs to |
| :-- | --: | --: | :-- |
| `src/domains/` | 179 | 21,015 | server |
| `src/core/` | 41 | 2,849 | server |
| `src/tooling/` | 26 | 2,484 | node CLI (build/ops time) |
| `src/provisioning/` | 10 | 1,293 | node CLI (build/ops time) |
| `src/tests/` | 2 | 627 | node |
| `src/ports/` | 3 | 420 | mixed |
| `src/browser/` | 5 | 383 | browser only |
| root `src/*.ts` | 6 | 202 | mixed |
| **Total** | **271** | **29,273** | |

Inside `src/domains/`, three subsystems hold 69% of the domain code:

| Domain | Files | LOC | Shape |
| :-- | --: | --: | :-- |
| `marketplace-orders` | 41 | 6,579 | `commands/` 4,295 — one class split into 17 abstract inheritance links (`MarketplaceOrderPart1` … `Part17`), raw SQL through an injected `MarketplaceDb` port; `application/` 126; `repositories/` 912; `tests/` 1,159 |
| `data-health` | 25 | 5,351 | `repositories/` 4,796 — a 12-part repository plus storage inventory (2 parts), order purge, schema comparison; every part repeats the same 12-line import header |
| `profile` | 34 | 2,598 | 5-part repository, `entities/` 481 |
| other 15 domains | 79 | 6,487 | small |

**Diagnosis.** The package is not large because it holds 18 domains. It is large because it holds
four things that are not persistence:

| Not persistence | LOC | Share |
| :-- | --: | --: |
| Build/ops CLI suite (`tooling/` + `provisioning/`) | 3,777 | 12.9% |
| Domain vocabulary (`domains/*/entities/` + `arabic-search.ts`) | 1,078 | 3.7% |
| Browser IndexedDB store (`browser/`) | 383 | 1.3% |
| Order application service and access layer (`marketplace-orders/commands` + `application`) | 4,421 | 15.1% |

The first three leave in this change. The fourth stays, for a reason stated in §7.

Door pressure is a second symptom: **37 doors** (18 per-domain, 7 `*/entities`, 12 other), of
which the 7 `*/entities` carry pure types with no server code, and `./control-ota` has **zero
consumers anywhere in the repository** — the file is referenced only by `package.json` and the
pinned door list in the contract test.

> Correction to existing documentation: `module-isolation-rules.md` (rule 2),
> `package-exports.md`, and `browser-server-boundaries.md` all state "33 doors". The `exports`
> map holds 37. The docs are stale by four doors and must be corrected in this change regardless
> of the decomposition.

---

## 2. Invariants this plan must not break

| # | Invariant | Source |
| :-- | :-- | :-- |
| I1 | `src/core/database/` has no door. No `exports` entry resolves into it, so nothing outside the package can reach `drizzle-orm`, `better-sqlite3`, or `@libsql/client`. | `data-core-module.md`; asserted by `src/tests/index.test.ts` |
| I2 | Database vendor SDKs have declared owners and application code is never one of them. | `capability-registry.ts` `vendorModules`; `checkVendorOwnershipContract` |
| I3 | Migrations, the shard map, and schema parity live with the database owner. One physical database = one migration journal. `profile/migrations/` alone serves `profile`, `follow`, `seller-discounts`, `system-logs`, and `control-release-state`. | `database-shards.ts`; `schema-parity.test.ts` |
| I4 | The root door is never a barrel over the domains. | `data-core-module.md`; contract test |
| I5 | No `"./*"` door and no `@asol/data-core/*` tsconfig path wildcard. | `data-core-module.md` |
| I6 | Ports are owned by the capability that defines the meaning; `data-core` implements them. Established by `@asol/system-logs-core` owning the port while `data-core/composition` exports the adapter. | `src/composition.ts` |

I3 is the reason a per-domain split is rejected outright. I1 is the reason a "privileged ops
door" is rejected — see §7.

---

## 3. Target shape

Three new packages, four existing packages absorb vocabulary, one package shrinks.

### 3.1 `@asol/data-browser-core` (new)

Owns IndexedDB and `AsolDB`. Nothing else in the repository may touch `indexedDB`.

* Moves in: `packages/data-core/src/browser/**` — `asol-db/index.ts` (321), `asol-db-persister.ts`
  (36), `clear-browser-databases.ts` (23), `index.ts` (3), `workers/asol-push-sw.js`.
* Owns its own telemetry port: the browser half of `src/ports/telemetry.ts`
  (`traceBrowserDatabaseOperation` and its registration/reset/accessor) becomes
  `packages/data-browser-core/src/ports/telemetry.ts`. The server half
  (`traceServerLayer`, `traceDatabaseQuery`, `createDrizzleDevLogger`, `QueryLogger`,
  `DatabaseQueryDescriptor`) stays in `data-core`.
* Vendor: none owned. Package deps: `@tanstack/react-query-persist-client`, `zustand`.
* Depends on `@asol/data-core`: **no edge at all.**
* Doors: `.` (stores, get/set, `ASOL_DB_STORES`, `AsolDbStoreName`, persister, reset),
  `./telemetry`.
* 58 import sites move from `@asol/data-core/browser` to `@asol/data-browser-core`.

**Why the port splits instead of moving to `observability-core`.** `observability-core` persists
its monitor store *into* AsolDB (`monitor-store.ts`, three `monitor-store-parts/*`,
`asol-db-monitor.ts`). If it also owned the port, `data-browser-core` would import
`observability-core` and `observability-core` would import `data-browser-core` — a real cycle.
Splitting the port by side keeps both edges one-way: `observability-core → data-core/telemetry`
and `observability-core → data-browser-core/telemetry`. It also matches the composition roots,
which already register the browser side and the server side separately
(`src/core/composition/browser-ports.ts` vs `server-ports.ts`).

### 3.2 `@asol/data-ops-core` (new)

Owns provisioning, schema sync, database lifecycle, and every maintenance executable.

* Moves in: `packages/data-core/src/provisioning/**` (10 files, 1,293) and
  `packages/data-core/src/tooling/**` (26 files, 2,484).
* Vendor: **declared co-owner** of `better-sqlite3`, `@libsql/client`, `drizzle-orm`,
  `drizzle-orm/better-sqlite3`, `drizzle-orm/libsql`. `ownersOfVendor()` already returns an
  array and `checkVendorOwnershipContract` already accepts any owner, so this is a registry
  edit, not a new mechanism.
* Doors: `.` (schema sync, provisioning report types, shard verification),
  `./tooling` (executables re-exported for `scripts/provision-turso.ts`).
* Depends on `@asol/data-core` through exactly one new door: `./migration-manifest`.

**The migration-path problem, and its fix.** Nine files under `tooling/` reach migration folders
by hard-coded cross-package filesystem path, e.g.

```
packages/data-core/src/core/database/migrations
packages/data-core/src/core/database/profile/migrations
```

in `create-sqlite-db.ts`, `create-profile-sqlite-db.ts`, `create-product-sqlite-db.ts`,
`create-notifications-sqlite-db.ts`, `create-advertisements-sqlite-db.ts`,
`create-marketplace-orders-sqlite-db.ts`, `apply-users-migrations.ts`,
`reset-advertisements-db.ts`. A filesystem path is coupling that no `exports` map can express
and no guard can enforce, and after the move it would silently point across a package boundary.

Fix: `data-core` gains `./migration-manifest`, a door that exports **paths only** — no driver,
no client, no schema object:

```ts
// packages/data-core/src/migration-manifest.ts
export const MIGRATION_FOLDERS = {
  users:          <abs>,
  profile:        <abs>,
  product:        <abs>,
  notifications:  <abs>,
  advertisements: <abs>,
  marketplaceOrders: <abs>,
} as const;
export type MigrationDatabase = keyof typeof MIGRATION_FOLDERS;
```

Every hard-coded path in `data-ops-core` is replaced by a lookup. A contract test asserts each
returned path exists and contains a `meta/_journal.json`.

### 3.3 `@asol/profile-core` (new)

Owns the profile-account vocabulary. The grouping is not invented — it is exactly what
`PROFILE_SHARDS` already groups into one physical family: `user_profiles`, `follows`,
`seller_discounts`, `profile_featured_products`, `profile_trending_items`.

| Moves in | From | Files | LOC |
| :-- | :-- | --: | --: |
| `src/profile/` | `data-core/src/domains/profile/entities/` | 10 | 481 |
| `src/discounts/` | `data-core/src/domains/seller-discounts/entities/` | 2 | 179 |
| `src/catalog/` | `data-core/src/domains/pharmacy-profile-catalog/entities/` | 2 | 114 |
| `src/follow/` | `data-core/src/domains/follow/entities/` | 2 | 64 |
| | | **16** | **838** |

* Doors: `.` only.
* Depends on `@asol/product-core` (`profile-review.entity.ts` imports `RatingDistributionItem`,
  `ReviewSort`, `SellerReply`; `pharmacy-profile-catalog.types.ts` imports `ProductRecord`).
  One-way.
* Vendor: none. Browser-safe: no `server-only`, no `node:*`.
* `@asol/data-core/profile/entities` has 72 import sites — the largest consumer surface of the
  whole package. All 72 move to `@asol/profile-core`.

### 3.4 Vocabulary absorbed by existing owners

| From `data-core` | To | Files | LOC | Note |
| :-- | :-- | --: | --: | :-- |
| `domains/auth/entities/` | `@asol/auth-core` (`src/entities/`) | 3 | 27 | |
| `domains/product/entities/` | `@asol/product-core` (`src/entities/`) | 2 | 53 | |
| `domains/ota/entities/` | `@asol/ota-core` (`src/domain/release/`) | 2 | 66 | see below |
| `domains/product-search/entities/` + `domains/product-search/utils/arabic-search.ts` | `@asol/catalog-core` (`src/search/`) | 3 | 94 | see below |

**`product-search` goes to `catalog-core`, not `product-core`.** `product-search.types.ts`
imports `ProductRecord` from `product-core` **and** `ProfileDirectoryEntry` from the profile
entities. Placing it in `product-core` would create `product-core → profile-core` while
`profile-core → product-core` already exists — a cycle. `catalog-core` ("Category catalog
domain") can depend on both, one-way. `arabic-search.ts` is 8 lines and is re-exported by
`product-search/entities/index.ts`; it travels with them.

**`ota` also moves its port, closing a documented cycle.** `ota-core/src/domain/release/manifest-types.ts`
carries the comment that duplicating row projections "closed a package cycle: data-core imported
this package for the types while this package reads and writes through data-core". The clean
resolution is I6: the `OtaReleaseRepository` **interface** moves from
`data-core/src/domains/ota` to `@asol/ota-core/src/ports`, and `data-core` implements it —
the same shape `system-logs-core` already uses. After this, `@asol/ota-core` has **no import of
`@asol/data-core` at all**; its two remaining edges are `@asol/data-browser-core` and its own
port.

### 3.5 `@asol/data-core` after the change

Keeps, and owns exclusively:

* `src/core/database/**` — drivers, adapters, schemas, migrations, shard router, connection
  cache, runtime policy. **Still no door.**
* `src/core/turso/**`, `src/core/data-source-registry.ts`, `src/core/database-runtime-policy.ts`.
* `src/domains/<18>/` — queries, commands, repositories, persistence row types, `index.server.ts`.
* `src/ports/runtime-config.ts`, `src/ports/product-search-fields.ts`, server `src/ports/telemetry.ts`.
* `src/composition.ts`, `src/control-release-state.ts`, `src/control-system-logs.ts`,
  `src/ota-runtime.ts`, `src/index.ts`.
* New `src/migration-manifest.ts`.

Deleted: `src/control-ota.ts` (51 LOC, zero consumers, and the only file that imports
`@libsql/client` and `drizzle-orm/libsql` at package root rather than inside `core/database` —
removing it restores I1's spirit as well as its letter).

| Metric | Before | After |
| :-- | --: | --: |
| Files | 271 | 204 |
| LOC | 29,273 | 23,984 |
| Doors | 37 | 27 |
| Non-persistence LOC | 5,238 (18%) | 0 |

### 3.6 Resulting dependency graph

```
format-core   orders-core   auth-core   product-core
                                             ↑
                                        profile-core
                                             ↑
                                        catalog-core ──→ product-core
                                             ↑
  ┌──────────────────────────────────────────┴────────────────────────┐
  │                        @asol/data-core                            │
  │  (sole owner of drizzle / better-sqlite3 / @libsql at runtime)    │
  └───────────────────────────────┬───────────────────────────────────┘
                                  │ ./migration-manifest  (paths only)
                                  ↓
                          @asol/data-ops-core        (co-owns the vendors, CLI only)

  @asol/data-browser-core        (IndexedDB; no edge to data-core)
        ↑                                    ↑
  observability-core ──→ data-core/telemetry │
  ota-core ──────────────────────────────────┘   (no edge to data-core)
```

Every remaining `*-core → data-core` edge is removed by this change. The only inbound edges to
`data-core` become the application, the services, and `data-ops-core`.

---

## 4. Door manifest

### Removed from `@asol/data-core` (11)

`./browser`, `./tooling`, `./provisioning`, `./control-ota`, `./auth/entities`,
`./follow/entities`, `./pharmacy-profile-catalog/entities`, `./product-search/entities`,
`./product/entities`, `./profile/entities`, `./seller-discounts/entities`

`./control-ota` is deleted outright; the other 10 relocate to their new owners.

### Added to `@asol/data-core` (1)

`./migration-manifest`

### Kept (27)

Eight non-domain doors — `.`, `./composition`, `./control-release-state`,
`./control-system-logs`, `./ota-runtime`, `./runtime-config`, `./product-search-fields`,
`./telemetry` — plus the new `./migration-manifest`, plus all 18 per-domain server doors
(`./account-deletion`, `./advertisements`, `./auth`,
`./data-health`, `./dev-cloud-backup`, `./feature-flags`, `./follow`, `./marketplace-orders`,
`./notifications`, `./ota`, `./password-recovery`, `./pharmacy-profile-catalog`, `./product`,
`./product-search`, `./profile`, `./seller-discounts`, `./super-admin`, `./system-logs`).
37 − 11 + 1 = 27.

### New packages' doors

| Package | Doors |
| :-- | :-- |
| `@asol/data-browser-core` | `.`, `./telemetry` |
| `@asol/data-ops-core` | `.`, `./tooling` |
| `@asol/profile-core` | `.` |

---

## 5. Consumer rewrite map

| Old specifier | New specifier | Sites |
| :-- | :-- | --: |
| `@asol/data-core/profile/entities` | `@asol/profile-core` | 72 |
| `@asol/data-core/browser` | `@asol/data-browser-core` | 58 |
| `@asol/data-core/product/entities` | `@asol/product-core` | 9 |
| `@asol/data-core/seller-discounts/entities` | `@asol/profile-core` | 8 |
| `@asol/data-core/pharmacy-profile-catalog/entities` | `@asol/profile-core` | 7 |
| `@asol/data-core/auth/entities` | `@asol/auth-core` | 6 |
| `@asol/data-core/product-search/entities` | `@asol/catalog-core` | 4 |
| `@asol/data-core/follow/entities` | `@asol/profile-core` | 4 |
| `@asol/data-core/provisioning` | `@asol/data-ops-core` | 4 |
| `@asol/data-core/tooling` | `@asol/data-ops-core/tooling` | 1 |
| `@asol/data-core/telemetry` (browser call sites only) | `@asol/data-browser-core/telemetry` | 2 of 8 |

Roughly 175 import sites. Every one is rewritten in this change; none is left behind a shim.

---

## 6. Execution steps

Ordered for a working tree that never has to compile in an intermediate state — the whole set is
one commit.

1. **Registry.** Add three entries to `CAPABILITY_PACKAGES` in
   `packages/architecture-core/src/registry/capability-registry.ts`:
   `data-browser-core` (`vendorModules: []`), `data-ops-core` (`vendorModules:` the five database
   SDKs), `profile-core` (`vendorModules: []`). All `layer: 'capability'`, `mayImportApp: false`.
   Package count 47 → 50.

2. **Scaffold** `packages/data-browser-core/`, `packages/data-ops-core/`, `packages/profile-core/`
   with `package.json` (explicit `exports`, no wildcard), `src/`, `src/tests/index.test.ts`.

3. **Move `browser/`.** `git mv packages/data-core/src/browser/*` into
   `packages/data-browser-core/src/`. Split `src/ports/telemetry.ts`: browser half to
   `packages/data-browser-core/src/ports/telemetry.ts` with its own
   `registerDataBrowserTelemetry` / `resetDataBrowserTelemetry`; server half stays in
   `data-core`. Delete the `./browser` door.

4. **Move vocabulary.** `git mv` the eight `entities/` directories (and `arabic-search.ts`) to
   their destinations in §3.3/§3.4. Delete the seven `*/entities` doors. Inside `data-core`,
   every repository/query/command that referenced a relative `../entities/...` now imports the
   owning package.

5. **Move the OTA port.** `OtaReleaseRepository` interface → `packages/ota-core/src/ports/`.
   `data-core/src/domains/ota/repositories/ota-release-repository.ts` implements
   `@asol/ota-core`'s interface. Delete the duplicated row projections in
   `ota-core/src/domain/release/manifest-types.ts` and the comment that describes the old cycle.

6. **Create `./migration-manifest`.** New `packages/data-core/src/migration-manifest.ts` exporting
   `MIGRATION_FOLDERS`. Add the door.

7. **Move `provisioning/` and `tooling/`.** `git mv` both trees into
   `packages/data-ops-core/src/`. Replace all nine hard-coded migration paths with
   `MIGRATION_FOLDERS` lookups. Delete the `./provisioning` and `./tooling` doors from
   `data-core`.

8. **Delete `src/control-ota.ts`** and its door.

9. **Rewrite consumers** per §5 across `src/`, `packages/`, `scripts/`.

10. **Root `package.json`.** Repoint the ~20 `db:*` scripts from
    `packages/data-core/src/tooling/*` to `packages/data-ops-core/src/tooling/*`
    (`db:migrate:users`, `db:sync:users`, `db:create:sqlite`, `db:create:profile`,
    `db:create:product`, `db:reset:advertisements`, `db:reset:advertisements:cloud`,
    `db:drop:factory-reset`, `db:drop:factory-reset:cloud`, `db:ensure`, `db:migrate:product`,
    `db:migrate:orders`, `db:migrate:product-image-urls`, `db:migrate:profiles`,
    `db:migrate:phones-e164`, `db:verify:sqlite`, `db:verify:turso`). Add
    `test:data-browser-core`, `test:data-ops-core`, `test:profile-core`; wire all three into
    `build`, `build:static`, and `test` through `scripts/run-generated-gate.ts`.
    `test:data-core` keeps its existing chain minus the moved tests.

11. **Push-worker references.** `asol-push-sw.js` moves with `browser/`. Update its four
    external references: `scripts/sync-data-access-public-artifacts.ts` (source path),
    `packages/branding-core/src/tests/index.test.ts:279` (hard-coded read path),
    `packages/architecture-core/src/checks/architecture-types.ts` (`PUBLIC_PUSH_WORKER` and the
    adjacent list), `packages/architecture-core/src/contracts/notification-contract.ts`.

12. **tsconfig paths.** Root `tsconfig.json`: replace the 37 `@asol/data-core*` path entries with
    the 27 kept doors plus the new packages' doors. Regenerate the seven `services/*/tsconfig.json`
    (37 data-core entries each) through the service-sync generator — never by hand.

13. **Vendor and layer contracts.** In `packages/architecture-core/src/contracts/contract.ts`,
    the three regex lists that currently pin `^packages/data-core/src/` gain
    `^packages/data-ops-core/src/`. Classify the new doors' layers.

14. **New guards** in `@asol/architecture-core`:
    * `indexedDB` / `IDBDatabase` outside `packages/data-browser-core/` → violation.
    * A path segment `entities/` under `packages/data-core/src/domains/` → violation.
      (Stated as a path rule, because "business entity" is not mechanically detectable.)
    * A door target under `packages/data-core/src/core/database/` → violation (already asserted
      in the contract test; promoted to the scan).
    * A string literal matching `packages/data-core/src/core/database/.*migrations` outside
      `packages/data-core/` → violation (protects step 7 from regressing).
    * `@asol/data-core` imported by any `packages/*-core` other than `data-ops-core` → violation.

15. **Contract tests.** `data-core`'s `src/tests/index.test.ts`: update the pinned door list to
    the 23, keep the no-wildcard / no-barrel / no-`core/database`-target assertions, add the
    migration-manifest existence assertion, and add "no `*-core` package imports this package
    except `data-ops-core`". New `index.test.ts` in each new package asserting its own door set,
    its declared `@asol` edges, and — for `data-browser-core` — that the transitive closure of
    `.` touches no `node:*` builtin and no database driver (the assertion moves out of
    `data-core`, where it currently lives).

16. **Service mirrors.** `npm run services:sync`. The seven mirrors under `services/*/generated/`
    regenerate; `data-core` mirrors shrink and three new mirrored packages appear where imported.

17. **Documentation.**
    * `docs/05-platform-features/sealed-packages/data-core-module.md` (**editable**) — rewritten
      for the new shape. Also correct the current claim that the three drivers are imported only
      inside `src/core/database/`: after this change it becomes true for `data-core`; state
      `data-ops-core`'s co-ownership explicitly.
    * `docs/02-data-and-storage/central-data-access.md` (**editable**) — directory-ownership table.
    * Three new `sealed-packages/*.md` for the new packages (**editable**).
    * `docs/01-architecture/02-packages/module-isolation-rules.md` (**protected**) — package count,
      door count, mandatory-gateway row for the dual vendor ownership, new forbidden directions.
    * New ADR under `docs/01-architecture/09-decisions/` (**protected**) covering: the
      decomposition axis, the dual vendor ownership, the five new guards, and the rejected
      alternatives in §7.
    * `capability-map.md`, `dependency-map.md`, `package-catalog.md`, `package-exports.md` and
      everything under `docs/09-agent-knowledge/generated/` are **generated** — regenerate with
      `npm run architecture:docs` and `npm run docs:generate`, never hand-edit.
    * Protected paths require authorization: the commit message must carry the literal marker
      `[docs-contract-change]`, or the run must set `DOCS_CONTRACT_CHANGE=1`. Update
      `docs/09-agent-knowledge/document-mutability.json` if any new path needs classification.

18. **Delete.** After every import is rewritten: the moved directories, the removed doors, the
    dead `control-ota.ts`, the duplicated OTA row projections in `ota-core`, and any adapter left
    without a consumer. No `@deprecated`, no re-export file, no alias survives the commit.

---

## 7. Rejected alternatives, and why

**One package per domain (18 data packages).** Rejected on I3. `profile/migrations/` is a single
journal serving five domains, and the `system-ops` shard mixes `system_logs`,
`control_release_state`, and eight `data_health_*` tables. Splitting domains without splitting
migrations is impossible; splitting migrations is impossible because one journal is one physical
database. Independently: cross-domain coupling is already negligible (17 edges
`data-health → marketplace-orders`, everything else 1–2), so the decoupling gain is near zero,
while `service-mirror-core` already prunes at file level — the `orders` deployment receives 46 of
271 files today. Package boundaries would buy no deployment isolation that does not already exist.

**A privileged `@asol/data-core/ops` door instead of dual vendor ownership.** Rejected on I1. The
36 files in `tooling/` + `provisioning/` create SQLite files, run the Drizzle migrator, open
libSQL clients against arbitrary Turso URLs, read schemas, and apply raw DDL. A door that serves
them honestly ends up re-exporting the driver capability surface with one extra hop, which is the
exact failure I1 exists to prevent. Dual ownership keeps the guarantee that matters — no
application file, no service, no other package can reach a driver — while `checkVendorOwnershipContract`
already supports multiple owners (`ownersOfVendor()` returns an array). The narrow paths-only
`./migration-manifest` door is the one thing that genuinely must cross, and it carries no code.

**Moving `data-health` out of `data-core`.** Rejected. All 12 repository parts open all four data
sources, use `ShardedRawDatabaseClient`, and read `DATABASE_SHARDS` / `DATABASE_SHARD_TABLE_TO_DATABASE`.
It is cross-shard raw SQL; it belongs with the shard router. Its
`schema-comparison.repository.server.ts` looks provisioning-shaped, but it is consumed at runtime
by `src/features/data-health/server/services/data-health-service.server.ts`, so moving it to
`data-ops-core` would make the running application depend on the ops CLI package.

**Moving the order service out.** `MarketplaceOrderService` is driver-free — it writes SQL strings
against the injected `MarketplaceDb` port — so it *could* move without touching vendor ownership.
Rejected anyway: it is 4,295 lines of raw SQL, and raw SQL outside the database owner is exactly
what the mandatory gateway and the `db.execute(...)` regex in `contract.ts` exist to prevent.
It stays. Its 17-link abstract-inheritance chain is a real problem, but it is a
single-responsibility problem inside one domain, not a package-boundary problem, and it is
**explicitly out of scope here**.

**Introducing explicit `DB Row → Domain Entity` mappers across all 18 domains.** Rejected for this
change. It touches ~180 files, is required by none of the boundaries above, and is not verifiable
by any guard this plan adds. Bundling it would make a mechanical, reviewable move indistinguishable
from a semantic rewrite. It is a separate piece of work.

**A single `@asol/domain-entities-core` holding all eight vocabularies.** Rejected: it would own
eight capabilities at once, against one-capability-one-owner. Four of the eight have existing
owners; the remaining four (`profile`, `follow`, `seller-discounts`, `pharmacy-profile-catalog`)
are one coherent family, and `PROFILE_SHARDS` already treats them as one — hence exactly one new
vocabulary package, not four and not one catch-all.

---

## 8. Verification block

Run as one gate. Any failure means the commit is not made.

```bash
npm run architecture:check
npm run docs:ci
npm run typecheck
npm run lint
npm run test:data-core
npm run test:data-browser-core
npm run test:data-ops-core
npm run test:profile-core
npm run test:product-core
npm run test:auth-core
npm run test:catalog-core
npm run test:ota-core
npm run test:observability-core
npm run services:sync
npm run build
npm run build:static
npm run runtime:check
```

`npm run services:sync` matters most: a broken import graph surfaces there as a missing mirror
entry, not as a type error.

Additional assertions to confirm by hand before committing:

* `grep -r "@asol/data-core/\(browser\|tooling\|provisioning\|control-ota\)" src packages scripts`
  returns nothing.
* `grep -r "entities" packages/data-core/src/domains --include=*.ts -l` returns nothing.
* `grep -rn "packages/data-core/src" packages/data-ops-core` returns nothing.
* Every mirror under `services/*/generated/packages/data-core/src/` contains no `browser/`,
  `tooling/`, `provisioning/`, or `entities/` directory.

---

## 9. Cost and risk

| | |
| :-- | :-- |
| Packages | 47 → 50 |
| `data-core` files / LOC | 271 → 204, 29,273 → 23,984 |
| `data-core` doors | 37 → 27 |
| Import sites rewritten | ~175 |
| tsconfig path entries touched | 37 root + 7 × 37 generated |
| Files moved by `git mv` | 67 moved, 1 deleted, 1 created |
| New guards | 5 |
| Protected docs touched | 2 + 1 new ADR — needs `[docs-contract-change]` |

**Highest risk:** step 12/16. The seven service tsconfigs and the seven mirrors are generated; if
the generator is not re-run, `architecture:check` passes while a deployment resolves nothing. This
is why `services:sync` is in the verification block rather than left to CI.

**Second risk:** step 3's port split. If a browser call site is rewritten to the server telemetry
door, nothing fails loudly — a trace line is lost, not a query. The `data-browser-core` contract
test must therefore assert that the browser door's transitive closure reaches
`data-browser-core/src/ports/telemetry.ts` and never `data-core`.

**Not a risk:** deployment size. The mirrors already prune per file; this change does not make any
deployment smaller. The gain is boundary clarity and the removal of every `*-core → data-core`
edge, not bytes shipped.
