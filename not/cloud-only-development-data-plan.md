# Cloud-Only Development Data and Storage Cutover Plan

## 0. Authority and Intent

This plan is the implementation blueprint for one atomic refactor of Gova's development data/storage topology.

The agreed target is:

> **Development runs locally, but normal application data requests use the same remote service/API contract as Static/Android/iOS. Turso is the server database source of truth and Cloudflare R2 is the server image-object source of truth.**

The implementation MUST remove persistent local filesystem SQLite application databases and the local filesystem image provider. It MUST completely remove the Data Health and Dev Cloud Backup capabilities. It MUST preserve AsolDB, including its durable remote-image Blob cache.

This is a cutover, not a compatibility migration. The final source tree must not retain a second local application-data backend, a hidden SQLite/R2 fallback, or dead feature ownership merely for compatibility.

The implementing agent MUST first follow `AGENTS.md`, run Context Packs for every touched capability, read the returned editable/protected documentation, preserve unrelated working-tree changes, and obey documentation mutability rules.

This plan does **not** by itself authorize deployment, commit/push, destructive cloud migration, dropping Turso tables, deleting R2 objects, or destroying user-created backup archives. Those actions retain their existing authorization requirements.

The final runtime is intentionally cloud-backed: once the cutover is complete, an ordinary user action performed in Development (create/update/delete through the normal application API) affects whichever cloud environment the selected deployed origins/credentials represent, exactly as that API normally does. Do not invent a local shadow database/bucket to make Development safer. Conversely, do not assume a separate staging cloud exists: if the configured canonical origins are production, Development user writes are production writes. Any future staging environment must be an explicit remote-origin/account configuration using the same contracts, not a local fallback.

---

## 1. Non-Negotiable Final Invariants

1. `npm run dev` must never create, open, read, write, rebuild, seed, or depend on a filesystem-backed SQLite database for application runtime data.
2. No build, schema-sync, provisioning, migration, or release-preflight step may require `public/sync_data/sync_sqlite/**`.
3. Development server database access, when a local server route legitimately reaches a repository, must use Turso/libSQL only.
4. Normal Development browser application-data requests must resolve through the same canonical remote route-owner/origin contract used by Static/Android/iOS. They must not use localhost merely because `next dev` exposes route handlers.
5. Turso credentials remain server-only. Browser code never connects directly to Turso.
6. Development image upload/delete/list/exists/resolve operations must use the storage profile's configured Cloudflare R2 provider. They must never resolve to filesystem storage.
7. R2 credentials remain server-only. Browser code uses the existing Business API/storage API boundary and public object URLs/cache pipeline.
8. No runtime fallback from Turso to SQLite is allowed.
9. No runtime fallback from R2 to `LocalStorageProvider`, `public/sync_data/sync_file`, or another R2 account is allowed.
10. `ASOL_DATA_SOURCE=local` must not survive as an alternate application backend. Remove the selector if no legitimate post-cutover responsibility remains.
11. `public/sync_data/sync_sqlite/**` must disappear as an application/build/provisioning input and must not be regenerated.
12. `public/sync_data/sync_file/images/**` must disappear as server-side uploaded-image persistence and must not be regenerated.
13. `/dev/data-health`, `/super-admin/data-health`, `/api/super-admin/data-health/**`, their redirects/aliases, `@asol/data-core/data-health`, and the dedicated Data Health capability/package ownership must be absent.
14. `/dev/dev-cloud-backup`, `/super-admin/dev-cloud-backup`, `/api/super-admin/dev-cloud-backup/**`, their redirects/aliases, `@asol/data-core/dev-cloud-backup`, and the dedicated Dev Cloud Backup capability/package ownership must be absent.
15. Static `out/`, Web, Android, and iOS must retain their existing remote service boundaries; this refactor must not introduce direct client database/storage credentials.
16. Existing Cloudflare R2 object keys and public URL semantics must not change accidentally while local path fields are removed.
17. Existing Turso rows must never be replaced with local SQLite rows as part of provisioning or schema synchronization.
18. Existing Turso tables that become obsolete because Data Health is removed must not be dropped automatically without separate destructive-cloud authorization.
19. Cloud-read verification may fail closed on missing credentials; it must not convert missing cloud configuration into a local fallback.
20. Release/build gates must test the new cloud-only architecture directly. They must not retain `db:ensure` or another local-database preparation step under a new name.

### Explicit preservation rule: AsolDB is required

The following browser-local persistence is required and MUST remain:

- `AsolDB` / IndexedDB itself.
- TanStack Query persistence through `queryCache`.
- Remote image Blob persistence through `imageCache`.
- ETag metadata, conditional revalidation, stale/offline Blob behavior, bounded pruning, in-flight deduplication, and invalidation.
- `imageUploadDrafts` durable upload-draft persistence.
- Other legitimate client/application AsolDB stores unrelated to server filesystem SQLite.

Do **not** interpret "remove local image storage" as permission to remove `packages/data-core/src/browser/image-cache/**`, `ASOL_DB_STORES.IMAGE_CACHE`, or the `@asol/storage-image-manager-core/image-cache` memory -> AsolDB -> network pipeline.

### SQLite dialect is not a local SQLite database

Turso/libSQL uses the SQLite SQL dialect. Therefore these are **not** deletion targets merely because their names contain `sqlite`:

- `drizzle-orm/sqlite-core`.
- `sqliteTable(...)` schema declarations used to model Turso tables.
- SQLite-compatible SQL syntax required by libSQL/Turso.
- Migration history kept as historical source evidence.

The forbidden implementation is a local database engine/file used as application, build, schema, provisioning, or maintenance state.

### Test-only exception

An isolated test may use an ephemeral in-memory or temporary-directory SQLite database only when all of the following are true:

- the code is under a test-only boundary;
- it never reads/writes `public/sync_data/sync_sqlite` or another application persistence path;
- it is not executed to prepare Development, build, provisioning, or release state;
- it cannot receive production/cloud credentials;
- the same behavior can be proven without mutating real Turso data.

Accordingly, `better-sqlite3` must leave every production/runtime/build/provisioning/tooling path. It may remain as a test-only development dependency only if an actual isolated test still requires it after the refactor. Do not turn unit tests into live-Turso mutation tests just to achieve a zero-string search result.

---

## 2. Verified Current-State Findings

The implementing agent MUST re-verify these facts against the live tree before editing. They were confirmed during plan review:

### Runtime database selection

- `src/core/config/runtime-context.ts` defines `AppDataSource = "local" | "cloud"` and classifies ordinary Development as `dataSource: "local"`.
- `packages/data-core/src/core/database-runtime-policy.ts` maps `runtime.dataSource === "local"` to `sqlite`.
- `packages/data-core/src/core/data-source-registry.ts` statically owns both SQLite and Turso clients and chooses between them at runtime.
- `packages/data-core/src/core/database/sharded-raw-database-client.ts` routes profile/order shards to `CachedSqliteConnection` whenever `isDevRuntime()` is true.
- `packages/data-core/src/core/turso/users-turso-client.ts`, `advertisements-turso-client.ts`, and `notifications-turso-client.ts` explicitly reject Turso during ordinary Development.
- `src/features/data/ports/data-core-runtime-config-ports.ts` contains `forceRemoteDataSource` workaround logic needed only because some deployments must escape the local-Development selection.
- Isolated service composition/mirroring currently carries `better-sqlite3` aliases/stubs because shared runtime source can still choose SQLite.

### Client transport

- `src/core/api/asol-api-config.ts` already sends owned Business API routes through `@asol/account-bridge` route ownership and configured service origins; this is the contract to preserve and make authoritative in Development.
- Non-business routes intentionally use page origin.
- `src/core/config/public-env.ts#getNotificationsPublicUrl()` still has a Development-only `window.location.origin` fallback specifically documented as using local `notifications.db`; that fallback conflicts with the target architecture.
- `@asol/native-core` already owns the canonical deployed account origins used by static/native/deployed-smoke (`API_BASE_URL`, `CONTROL_BASE_URL`, `NOTIFICATIONS_BASE_URL`, `PRODUCTS_BASE_URL`, `ORDERS_BASE_URL`, `PROFILES_BASE_URL`, `SUBMAIN_BASE_URL`, `SUB2MAIN_BASE_URL`). Development should reuse this same source instead of duplicating URL strings.
- `packages/account-declarations/src/accounts/local-development.ts` and `scripts/dev-distributed.ts` intentionally point a separate distributed-development harness at localhost ports 3001-3008. That harness is not the target transport for ordinary `npm run dev` after this cutover.
- Development environment/origin configuration must be checked so route owners (`control`, `notifications`, `products`, `orders`, `profiles`, `submain`, `sub2main`) are all usable without local business-data fallback.
- `next.config.ts` currently allows the LAN Dev host `192.168.1.2`, while `@asol/cors`'s built-in development origins include localhost/127.0.0.1 but not that LAN origin. Once ordinary Dev calls deployed APIs/R2, cross-origin CORS becomes a hard runtime prerequisite for both Business APIs and AsolDB Blob fetches.

### Local database/schema pipeline

- `packages/dev-core` owns `public/sync_data/sync_sqlite`, SQLite filenames, shard filenames, and local path resolvers.
- `public/sync_data/sync_sqlite/**` currently contains real application database state, not placeholders. Plan-review inventory: 28 files (~6.33 MB), including 23 `.db` files and 5 staged remnants; 27 entries are tracked and `system-ops.db` is ignored runtime state. Re-inventory at execution time.
- `packages/data-core/src/provisioning/core/sqlite-schema-reader.ts` opens local `.db` files with `better-sqlite3` and converts them to `DatabaseSchema`.
- `packages/data-core/src/provisioning/core/schema-sync.ts` treats those local files as the desired schema and compares them to Turso.
- `scripts/schema-sync.ts` reports `sqliteSchemaVersion` and release sync currently relies on that model.
- `packages/data-core/src/tests/schema-parity.test.ts` assumes every routed cloud database is synchronized from a local SQLite source.
- Several runtime repositories are also schema writers today: `control-release-state.ts`, `system-logs.repository.server.ts`, and `seller-discount-repository.ts` execute `CREATE TABLE`/`ALTER TABLE`/`CREATE INDEX` during normal use. This is a second schema authority and must be retired once desired manifests provision those objects.
- `system-logs.repository.server.ts` additionally performs a data backfill (`trust_level='legacy'` server/API rows -> `origin='cloud'`). That data migration must not be lost when runtime schema repair is removed.
- `account-deletion-registry.coverage.ts` discovers user-owned tables by concatenating historical migration SQL. That is not a safe final-current-schema source after the manifest cutover and must be rewritten against desired manifests.
- `npm run build` currently includes `db:ensure` followed by `db:schema:sync` through `scripts/generated-gates.ts`.
- `deploy:all` preflight exposes `db:ensure` as "local database availability" before `db:schema:sync:release`.

### Dangerous provisioning behavior that MUST be removed

- `packages/data-core/src/tooling/provision-database-shards.ts` currently opens a local shard SQLite file, drops the corresponding Turso tables, recreates schema objects, deletes cloud rows, and copies local rows into Turso.
- `scripts/provision-turso.ts` invokes shard provisioning and then runs schema synchronization with exact cleanup.
- Therefore the existing `db:provision:turso` / shard provisioning path MUST NOT be run as a harmless verification step during this refactor. It must be redesigned before use.

### Mixed local/cloud maintenance tooling

Several useful cloud maintenance tools still import `better-sqlite3` because they update both local SQLite and Turso. Examples include current equivalents of:

- `migrate-r2-image-public-url.ts`;
- `migrate-r2-cloud-folders.ts`;
- `strip-product-image-urls.ts`;
- `reset-advertisements-db.ts`;
- `drop-factory-reset-tables.ts`;
- `enforce-notification-token-cardinality.ts`;
- `verify-turso-shards.ts`.

These tools must be classified individually. Preserve legitimate cloud behavior by rewriting it cloud-only; delete only the obsolete local half. Do not delete a cloud migration merely because it imports `better-sqlite3` today.

### Image persistence

- `packages/storage-core/src/server/providers/provider-resolver.ts` currently forces `LocalStorageProvider` in local Development regardless of the profile's R2 provider.
- `packages/storage-core/src/server/providers/local-storage.provider.ts` writes under `public/sync_data/sync_file/images/**`. Plan-review inventory found 37 non-placeholder image files (~1.90 MB): 11 avatars, 8 covers, 9 advertisements, 4 products, and 5 `spicialOrder` images; 41 entries are tracked including `.gitkeep` placeholders. Re-inventory at execution time.
- `packages/storage-core/src/config/storage-profiles.json` contains both local `folder` and cloud `cloudFolder` semantics for multiple profiles.
- For avatar, cover, advertisements, and special-order profiles, the cloud folder differs from the old local folder. A naive deletion of `cloudFolder` would change R2 keys and is forbidden.
- `packages/data-core/src/browser/image-cache/**` and `packages/storage-image-manager-core/src/services/local-first-image-cache.ts` are AsolDB client caching and are explicitly required.

### Data Health

- Application surfaces exist under `src/app/dev/data-health`, `src/app/super-admin/data-health`, `src/app/api/super-admin/data-health/**`, and `src/features/data-health/**`.
- `packages/data-core/src/domains/data-health/**` and `packages/data-health-core/**` own persistence/policy for the capability. A repository-wide import audit found no independent `@asol/data-health-core` consumer: non-feature matches are only architecture/deployment/release gate registrations that exist because this feature exists.
- `DATABASE_SHARDS["system-ops"]` currently declares eight `data_health_*` tables.
- `packages/data-core/src/domains/account-deletion/account-deletion-registry.persistence.ts` explicitly exempts those tables from account deletion; those exemptions become stale when the capability is removed.
- Data Health documentation and tests also encode local SQLite/local storage assumptions.

### Dev Cloud Backup

- Application surfaces exist under `src/app/dev/dev-cloud-backup`, `src/app/super-admin/dev-cloud-backup`, `src/app/api/super-admin/dev-cloud-backup/**`, and `src/features/dev-cloud-backup/**`.
- `packages/data-core/src/domains/dev-cloud-backup/**` implements the database adapter side.
- `packages/backup-core/**` owns the archive/restore capability and `.backups/dev-cloud/` lifecycle. A repository-wide import audit found no independent `@asol/backup-core` capability consumer; non-feature matches are only architecture/deployment/release gate registrations.
- At plan-review time `.backups/dev-cloud/` exists but contains zero files. The implementing agent must re-check at execution time because archives can be created after this plan was written.
- Restore can mutate all discovered Turso databases and R2 objects; removing the feature must not accidentally execute a restore or delete the only useful archive copy.

---

## 3. Execution Order and Safety Rules

Execute in dependency order. Never delete local infrastructure first and repair callers afterward.

Required order:

1. Re-run required Context Packs; capture Git/status, runtime, route-owner, database, storage-profile, script, package, and documentation inventory.
2. Capture one-time **read-only schema evidence** from every current local SQLite source before deleting it, and compare that evidence with the matching Turso schema. This is evidence for constructing the replacement desired-schema source, not a permanent runtime dependency.
3. Inventory tracked/local uploaded image files and map each referenced file to its canonical storage profile/object key before deleting filesystem copies.
4. Make Development browser Business API routing use the same configured service origins as Static/Android/iOS; remove explicit same-origin business-data fallbacks.
5. Make all server repository paths Turso-only and remove local-backend selection.
6. Introduce and verify the SQLite-independent desired-schema source; rewrite schema sync and provisioning before removing local `.db` files.
7. Rewrite release/build gates so schema verification no longer depends on `db:ensure`.
8. Classify every SQLite-based maintenance tool: delete local-only tools, rewrite dual local/cloud tools to cloud-only, preserve already-cloud-only tools.
9. Remove local SQLite runtime/tooling/path/artifacts only after Steps 5-8 are green.
10. Make Development storage-profile resolution R2-only while preserving exact current cloud object keys.
11. Verify/migrate only still-referenced local image files that are absent from the correct R2 target, when cloud writes are separately authorized; then remove filesystem image persistence.
12. Remove Data Health completely from source ownership, routing, tables-as-code, registries, tests, docs, and generated outputs.
13. Remove Dev Cloud Backup completely from source ownership, routing, package ownership, registries, tests, docs, and generated outputs. Handle existing archive files conservatively.
14. Remove obsolete service stubs/workarounds, regenerate service mirrors and generated documentation, run full zero-reference classification, and execute all non-publishing verification gates.

### Cloud safety rules

- Do not run the current destructive `provisionDatabaseShards()` implementation during the cutover.
- Do not run the current `db:provision:turso` until it has been rewritten to be non-destructive and SQLite-independent.
- Do not enable exact schema cleanup merely to make removed Data Health tables disappear from Turso.
- Do not run a cloud migration, R2 upload/delete, Turso row rewrite, or table drop unless the execution task separately authorizes that mutation.
- Read-only cloud inspection is allowed only when credentials and the task's access policy permit it; missing credentials must be reported, never replaced by local fallback.
- Never copy local SQLite rows over existing Turso rows as part of schema/provisioning work.
- Distinguish **normal application CRUD after the cutover** from **migration/administrative cloud mutation during implementation**. The former is the intended runtime behavior; the latter still requires the repository's normal authorization/guarding.
- Never delete a local image that is still referenced if it is the only verified copy.
- Never delete `.backups/dev-cloud/*.zip` merely because the feature code is deleted. Inventory them and treat archive-file retention/deletion as user data retention, separate from code deletion.

Preserve all pre-existing unrelated working-tree changes. Never reset/revert the repository to manufacture a clean baseline.

---

## 4. Phase A — Make Development Use the Static-Style Remote API Contract

### Goal

`next dev` remains the local UI/developer runtime, but normal application Business API traffic must be addressed exactly like Static/Android/iOS traffic: by canonical route owner and configured remote origin.

This does **not** mean turning `next dev` into a static export. It means eliminating data-source divergence at the transport boundary.

### Required changes

1. Treat `@asol/account-bridge` `ROUTE_OWNERSHIP` as the canonical browser Business API addressing contract. Do not add a second Development routing table.
2. Make ordinary `npm run dev` resolve owned Business API origins with the same precedence used by deployed/static tooling: an explicit `NEXT_PUBLIC_ASOL_*_URL` override first, otherwise the canonical deployed declaration already owned by `@asol/native-core`. Factor/reuse an architecture-legal shared resolver rather than copying production URL literals into multiple files.
3. Audit `src/core/api/asol-api-config.ts`, `src/features/account-bridge/ports/account-bridge-ports.ts`, `src/core/config/public-env.ts`, `next.config.ts`, static-build origin injection, and deployed-origin resolution so Dev/Static/Android/iOS cannot drift in account address.
4. Ensure Development receives a deployed origin for every route owner it can call: `control`, `notifications`, `products`, `orders`, `profiles`, `submain`, and `sub2main`. The ordinary Dev UI must not require ports 3002-3008 to be running in order to load application data.
5. Preserve method-specific ownership. Product/profile/order reads and writes may intentionally have different owners. Do not collapse all traffic onto one generic API base.
6. Remove `getNotificationsPublicUrl()`'s Development `window.location.origin` fallback that exists specifically to reach local `notifications.db`. Notifications Development traffic must use its declared deployed owner/origin contract.
7. Audit any other Business API helper for a Development-only same-origin fallback. Remove only fallbacks that provide application data; retain same-origin behavior for legitimate `/api/dev/**`, `/api/health`, and other non-business local tooling that survives this task.
8. Require missing owned-route origins to fail loudly. Never silently send an owned Business API request to `window.location.origin`.
9. Reclassify `localDevelopmentPublicEnv()` / `dev:distributed` as an **explicit service-development harness**, not the default application-data transport. It may remain for testing changes to local service code, but every service it starts must itself be Turso/R2-only after this plan, and its localhost origins must never become an automatic fallback for ordinary `npm run dev`.
10. If the distributed harness no longer provides unique value after cloud-origin Dev parity, delete it and its local-port declarations only after confirming no test/agent workflow depends on it. Do not delete it merely because its name contains `local`.
11. Keep server-to-server isolation unchanged. The account bridge may still return no browser origin on server execution; do not make deployments call each other merely to imitate browser routing.
12. Keep Turso/R2 credentials out of `NEXT_PUBLIC_*`. Development browser parity is API parity, not direct cloud credential access.
13. Update Development environment documentation/templates with **names only**, never secret values.

### CORS prerequisite for cloud-origin Development

Because the Dev page origin is now different from the deployed API/R2 origins, verify CORS as part of the cutover:

1. The deployed Business API accounts must allow every supported Development browser origin that Gova actually exposes. At minimum cover `http://localhost:3001` and `http://127.0.0.1:3001`.
2. Because current `next.config.ts` explicitly supports `192.168.1.2` for LAN Dev access, include `http://192.168.1.2:3001` in the supported Development-origin contract if LAN/mobile preview remains supported. Do not silently drop that existing access mode.
3. The relevant R2 buckets/accounts must allow the same Dev origins for GET/HEAD required by the AsolDB image Blob fetch/revalidation path. Image rendering alone is not sufficient proof because `fetch()` is CORS-governed.
4. Preserve native origins (`capacitor://localhost`, Android `https://localhost`, Ionic where supported) and production origins already required by release.
5. Add a read-only CORS verification that tests the declared policy/configuration. Updating Vercel/R2 CORS is a cloud mutation and requires its normal separate authorization; when not authorized, report the exact missing origin/account as a blocker rather than reverting to localhost storage/data.

### Required tests

Add/adjust tests proving:

- Development browser business routes resolve to the same owner **and canonical deployed origin source** as Static/Android/iOS for every registered method/path family, unless an explicit test/staging override is supplied.
- Ordinary `npm run dev` does not depend on `localDevelopmentPublicEnv()`/ports 3002-3008 for application data.
- Missing Development owner origin throws rather than using localhost.
- `getNotificationsPublicUrl()` no longer creates a localhost data path.
- `/api/dev/**` and `/api/health` remain intentionally non-business/local where applicable.
- Static, Android, iOS, and Web production route ownership remains unchanged.
- No public environment value exposes a Turso or R2 secret.
- CORS policy tests cover the supported Dev browser origins, including the existing LAN origin when LAN preview remains supported, without removing native/production origins.

---

## 5. Phase B — Make the Server Database Runtime Turso-Only

### Goal

There must be one supported server application database backend: Turso/libSQL. "Development" remains a runtime/build classification, not a database-backend selector.

### Required changes

1. Refactor `src/core/config/runtime-context.ts` so Development detection no longer implies a local application data source.
2. Remove `AppDataSource` / `dataSource` from runtime context entirely if its only remaining responsibility is choosing local versus cloud. Do not keep `local -> cloud` aliases.
3. Remove `ASOL_DATA_SOURCE` from server runtime parsing, env templates, tests, docs, and scripts if no non-backend responsibility remains.
4. Simplify `packages/data-core/src/core/database-runtime-policy.ts`: keep browser/native/static/server guards if still useful, but eliminate the SQLite/Turso branch. A valid server repository runtime resolves to Turso.
5. Refactor `packages/data-core/src/core/data-source-registry.ts` so users/products/advertisements/notifications instantiate only their Turso clients. Profiles remain sharded but must also be Turso-only.
6. Refactor `packages/data-core/src/core/database/sharded-raw-database-client.ts` to remove `CachedSqliteConnection`, local path imports, `sqliteConnections`, `executeSqlite`, `sqlite()`, and every `isDevRuntime() -> SQLite` branch. Keep table-to-shard routing and Turso retry behavior.
7. Remove `sqliteFileNameForShard` export from `database-shards.ts` once no runtime/provisioning caller needs local filenames.
8. Remove the Development-rejection guards in the users, advertisements, and notifications Turso clients. Server-only/browser guards and credential validation remain.
9. Audit product Turso access and every repository adapter for equivalent implicit Development refusal/fallback even when implemented differently.
10. Remove `forceRemoteDataSource` from `src/features/data/ports/data-core-runtime-config-ports.ts` after remote access is the invariant for every valid server repository runtime. Delete the historical comments/workarounds that describe service escape from SQLite.
11. Update composition roots so main app and isolated services register the same Turso-only data-core runtime contract without pretending Development is production.
12. Preserve the repository/data-source abstraction: features and repositories still request logical sources; they do not import `@libsql/client` directly.
13. Missing Turso credentials fail at the owning server boundary. Do not synthesize empty data and do not fall back to disk.

### Driver/dependency outcome

- No production/runtime/build/provisioning/tooling source may import `better-sqlite3` after the cutover.
- Remove `better-sqlite3` from `next.config.ts` server externals/tracing, production package dependencies, service aliases/stubs, composition comments, and runtime-only architecture rules once those paths disappear.
- If isolated tests still need `better-sqlite3`, keep it **dev/test-only** and add/retain an architecture rule that forbids it outside approved test paths.
- Do not remove `drizzle-orm/sqlite-core`; it models the Turso/libSQL dialect and is still valid.

---

## 6. Phase C — Replace SQLite Schema SSOT and Destructive Provisioning

### Why this phase is mandatory

Deleting Development SQLite while keeping build/release schema synchronization dependent on `.db` files would only hide the local database dependency. The final repository must be able to calculate desired Turso schema without opening any local SQL database.

### Required target design: repository-owned desired schema manifests

Create one **TypeScript** desired-schema manifest per logical Turso database under `@asol/data-core` provisioning ownership:

```text
packages/data-core/src/provisioning/desired-schema/
  users.ts
  product.ts
  advertisements.ts
  notifications.ts
  profile-core.ts
  profile-contact.ts
  profile-media.ts
  profile-social.ts
  profile-catalog.ts
  profile-promotions.ts
  profile-fulfillment.ts
  system-ops.ts
  orders-core.ts
  orders-items.ts
  orders-fulfillment.ts
  orders-delivery-plans.ts
  orders-shipping-quotes.ts
  orders-payments.ts
  orders-refunds.ts
  orders-after-sales.ts
  orders-disputes-audit.ts
  registry.ts
```

`registry.ts` must expose one typed map from the 21 logical database labels to their `DatabaseSchema`. It must derive/validate its shard labels against `DATABASE_SHARD_NAMES` so adding a shard without a manifest fails mechanically. The old non-cloud `profile.db` and `marketplace-orders.db` source files are not logical manifests and must not reappear.

Each manifest must describe the final intended schema for its one database: tables, columns, normalized CREATE SQL, primary-key metadata, defaults, uniqueness, indexes (including partial-index predicates), foreign keys, CHECK constraints, relevant table options such as `AUTOINCREMENT`, views, and triggers. Extend the neutral provisioning schema model where necessary rather than losing information. In particular:

- replace the current boolean-only PK representation with PK ordinal/position so composite keys are exact;
- read foreign keys from Turso with `PRAGMA foreign_key_list`;
- read uniqueness with `PRAGMA index_list` + `PRAGMA index_info/index_xinfo` so inline UNIQUE/auto-index constraints are not lost merely because `sqlite_master.sql` is null;
- compare column default values after a defined normalization, rather than ignoring them;
- preserve partial unique indexes and their `WHERE` predicates;
- model/verify CHECK constraints and `AUTOINCREMENT` semantics from a canonical representation rather than relying on fragile raw CREATE-SQL string equality.

Existing-table PK/FK/default/unique/CHECK/table-option drift must fail verification or be classified as requiring an explicit migration. Additive sync must never claim parity for a constraint it cannot repair.

The provisioning API must load these TypeScript manifests directly without `better-sqlite3`, embedded/local libSQL, temporary SQLite, or an in-memory SQLite compiler.

The desired-schema manifests become the **provisioning schema SSOT**. Historical Drizzle migration files remain migration history, and `sqliteTable(...)` declarations remain application data mappings for Turso. Neither historical migration replay nor a local `.db` file is the release-time final schema source. Add static parity checks between the application table declarations/routing maps and the manifests so the two representations cannot silently drift.

### One-time baseline procedure before deleting `.db` files

1. Export the schema of every current local database/shard through the existing reader while it still exists. Capture tables, columns, defaults, PKs, indexes, views, triggers, and normalized CREATE SQL.
2. Read the corresponding Turso schema non-destructively when credentials are available.
3. Compare local evidence, Turso read-back, current Drizzle table declarations, shard ownership maps, and special runtime-created objects.
4. Resolve every mismatch deliberately. Do not blindly choose whichever side has more objects.
5. Construct the final desired-schema manifest for each logical database from the verified intended state.
6. Exclude Data Health-owned `data_health_*` objects from the **final** `system-ops` desired manifest because the feature is being removed.
7. Include retained system-ops objects such as `system_logs` and `control_release_state` in the desired manifest so they are not dependent on ad-hoc local creation.
8. Preserve all current marketplace-order triggers/constraints that are runtime invariants. The orders migrations contain many guard triggers; the final manifests must not lose them.
9. Preserve intentional cross-shard reference stripping/ownership semantics. Profile source declarations contain references from tables in one profile shard to `user_profiles` in another, and the monolithic order migration contains relationships that cross the nine order shards. The **per-database desired manifests must represent the final Turso-local constraint set**, not blindly copy monolithic/source FKs. Keep an FK only when both parent and child tables live in the same Turso database; represent cross-shard relationships as application/domain invariants instead.
10. Add a parity test proving no desired manifest FK points to a table owned by another logical database. Also prove that required intra-shard FKs/triggers were not accidentally stripped.
11. Add a stable desired-schema fingerprint computed from the manifest, not from a `.db` file.
12. Inventory every production `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, `CREATE VIEW`, and `CREATE TRIGGER` outside provisioning. For schema already represented by the manifests, remove runtime schema mutation after the cloud schema is proven ready.
13. Specifically move `control_release_state`, `system_logs`, `seller_discounts`, and `seller_discount_usages` creation/index definitions into their `system-ops` / `profile-promotions` desired manifests and make their repositories data-only at runtime.
14. Extract the current system-log legacy-origin backfill into an explicit, idempotent Turso data migration/maintenance step. Verify it has run where needed before deleting the runtime backfill. Do not put row updates into schema manifests or generic read/write repository initialization.

Do not commit transient raw dumps containing data. Only schema facts belong in the desired-schema source.

### Rewrite schema sync

1. Delete `sqlite-schema-reader.ts` after the one-time baseline export and replace `readSqliteSchema(...)` with `readDesiredSchema(databaseLabel)` from the typed manifest registry.
2. Rename variables, function parameter names, comments, and report fields from `sqliteSchema*` to `desiredSchema*` / `sourceSchema*`; this includes `SchemaSyncReport.sqliteSchemaVersion`.
3. Keep `readTursoSchema(...)` as the live read-back side and extend it to read any newly modeled FK/composite-PK metadata.
4. Neutralize `schema-diff.ts` naming (`desired` vs `actual`) and keep safe additive behavior: create missing tables/indexes/views/triggers and add safe columns.
5. For PK/FK/constraint differences on an existing table, fail/warn as an explicit migration requirement rather than attempting destructive table recreation.
6. Keep read-back residual verification after DDL is applied.
7. Keep known logical-database ownership filtering so a database is compared only with objects it owns.
8. Exact cleanup must not be the default. Extra remote objects are warnings unless an explicitly authorized cleanup mode is invoked.
9. A removed Data Health table appearing only on Turso is an expected historical extra during this code cutover, not permission to drop it.
10. Missing required credentials in release/CI remains a hard failure.
11. Local Developer execution may run a **read-only** schema verification only when cloud credentials exist; it must never manufacture a SQLite source when they do not.
12. Add a source contract preventing application repositories from becoming independent schema migrators. Production DDL belongs to desired-schema provisioning/migration tooling, not lazy repository `ensureSchema()` calls. An explicitly named, guarded data migration may remain separate where row transformation is required.

### Rewrite provisioning

`db:provision:turso` must become creation + credential + desired-schema provisioning, never local-data synchronization.

Required behavior:

1. Ensure the declared Turso database/account exists.
2. Create/resolve credentials using existing platform APIs.
3. Write/update allowed local environment key names/values through the existing secret-safe mechanism.
4. Apply the desired schema additively from the repository manifests.
5. Re-read Turso and verify residual schema drift.
6. Never open a local SQLite database.
7. Never `DROP TABLE` merely to provision an existing database.
8. Never `DELETE FROM` application tables during ordinary provisioning.
9. Never copy local rows into Turso.
10. Never call exact cleanup implicitly.

Delete or completely rewrite `syncShardToTurso()` in `provision-database-shards.ts`. Its current drop/delete/copy behavior has no place in the final architecture.
Remove `ensureSqliteDirectory()` and `SQLITE_DIRECTORY` ownership from `turso-provisioner.ts` / provisioning exports; Turso provisioning must not create a local database directory as a side effect.

### Release/build gate replacement

- Remove `db:ensure` from `scripts/generated-gates.ts` and the release runbook.
- Split schema **verification** from schema **mutation**. A generic build/test should be able to validate desired-schema manifests without writing to Turso.
- Keep an explicit release schema-apply command (for example the existing `db:schema:sync:release` name after its internals are rewritten) for authorized manifest -> Turso DDL application.
- Add/rename a read-only `db:schema:verify` path that compares desired manifests with Turso when credentials are available and can also validate manifest ownership offline without a database.
- Remove schema mutation from the generic `npm run build` generated gate. `deploy:all` already owns a distinct release-schema preflight branch before the server/static builds; that is the correct place for authorized DDL application.
- `deploy:all` preflight must expose a cloud-schema readiness/apply branch, not "local database availability".
- Update `scripts/tests/deploy-all.test.ts`, `scripts/tests/deploy-all-resume.test.ts`, generated-gate contracts, `scripts/vercel-deployment-guards.ts`, release-console/runbook tests, and any checkpoint classification that treats `db:ensure` or generic build schema writes as prerequisites.

### Schema parity replacement tests

Rewrite `packages/data-core/src/tests/schema-parity.test.ts` or its successor to prove mechanically:

- every logical database/shard has exactly one desired-schema manifest;
- every routed application table has exactly one database owner;
- every table named in a shard map exists in that database's desired manifest;
- no desired FK crosses a Turso database boundary, while expected intra-database FKs remain;
- defaults, composite PK ordering, inline/named uniqueness, partial-index predicates, CHECK constraints, and required `AUTOINCREMENT` semantics participate in parity;
- no removed `data_health_*` table exists in the final desired manifests or routing map;
- retained `system_logs` and `control_release_state` are present in `system-ops`;
- every marketplace-order guard trigger expected by the domain is represented;
- desired schemas can be loaded with no `.db` file and no `better-sqlite3` import;
- schema sync reads Turso and compares against manifests without local SQL state;
- release schema sync is still ordered before release publication;
- no provisioning code contains row-copy semantics from local SQLite to Turso.

---

## 7. Phase D — Remove Local SQLite Runtime, Tooling, Paths, and Artifacts

Run this phase only after Turso-only runtime and desired-schema provisioning tests are green.

### Remove runtime implementation

Delete obsolete production/runtime local-database code after re-verifying no non-local responsibility remains, including current equivalents of:

- `sqlite-db-client.ts`;
- `product-sqlite-db-client.ts`;
- `advertisements-sqlite-db-client.ts`;
- `notifications-sqlite-db-client.ts`;
- `cached-sqlite-connection.ts`;
- `sqlite-file-identity.ts`;
- `sqlite-statement-execution.ts` if no test-only owner still needs it;
- `ensure-migrations.ts` and the product/advertisements/notifications Development migration-on-open helpers;
- local branches in sharded raw clients;
- local path/export responsibilities in `packages/data-core/src/core/database/environment.ts` and `environment.server.ts`, while preserving unrelated server-runtime assertions/configuration;
- runtime schema-repair helpers that are obsolete after manifest provisioning, including `ensure-system-logs-schema.ts` when no explicit migration/tooling responsibility remains;
- lazy schema mutation from `control-release-state.ts`, `system-logs.repository.server.ts`, and `seller-discount-repository.ts` after their desired manifests and any required data migration are proven.

Do not delete shared database interfaces, Turso clients, retry logic, Drizzle/libSQL adapters, SQL domain repositories, or `sqliteTable(...)` schema declarations used by Turso.

### Remove `@asol/dev-core` local-data ownership

Remove local persistence facts from `@asol/dev-core`, including obsolete equivalents of:

- `LOCAL_SQLITE_SEGMENT`;
- `PRIMARY_SQLITE_FILE` and other application DB filenames;
- `sqliteFileNameForShard()`;
- `resolveSqliteDirectory()` / `resolvePrimarySqlitePath()` / shard-path helpers;
- `LOCAL_SYNC_FILE_SEGMENT`, `LOCAL_IMAGES_SEGMENT`, `LOCAL_SYNC_FILE_PUBLIC_PREFIX` when no surviving non-image responsibility uses them;
- `resolveSyncFileRoot()` / `resolveLocalImagesRoot()` / `buildLocalSyncFilePublicUrl()` after the local image provider is removed.

Keep `@asol/dev-core`. The deep audit confirms it has a legitimate surviving responsibility: `guards/development-guard.ts` is consumed by `src/core/config/development-guard.server.ts` to protect developer-only tooling from Vercel/static/production-build execution. Shrink the package deliberately to that Development-guard responsibility.

Move schema-sync report path ownership (`SCHEMA_SYNC_REPORT_SEGMENT`, `resolveSchemaSyncReportPath`, `SCHEMA_SYNC_REPORT_PATH`) out of `@asol/dev-core` and into `@asol/data-core` provisioning/reporting ownership if schema reports remain. A cloud schema report is not a Development-core filesystem concern. After the move, remove `domain/database-files.ts`, `domain/shards.ts`, `domain/public-url.ts`, and local-persistence portions of `domain/paths.ts`/`server.ts` when their references reach zero.

### Classify tooling instead of blanket-deleting it

#### A. Delete local-only SQLite tooling

Delete commands/files whose only purpose is creating, migrating, splitting, syncing from, or verifying local application SQLite files, including current equivalents of:

- `create-sqlite-db.ts`;
- `create-profile-sqlite-db.ts`;
- `create-product-sqlite-db.ts`;
- `create-advertisements-sqlite-db.ts`;
- `create-notifications-sqlite-db.ts`;
- `create-marketplace-orders-sqlite-db.ts`;
- `ensure-sqlite-databases.ts`;
- `split-sqlite-shards.ts`;
- `verify-sqlite-runtime.ts`;
- `verify-sqlite-shards.ts`;
- `sync-users-sqlite-to-turso.ts`;
- local-only `apply-users-migrations.ts` after cloud schema provisioning owns the schema;
- `scripts/check-localhost-notifications.ts` or any successor whose definition of Development health is "notifications.db exists"; replace it only if a cloud-route connectivity diagnostic is still operationally useful.

Remove their npm scripts (`db:ensure`, `db:create:*`, `db:verify:sqlite`, `db:sync:users`, etc.) and every generated-gate/runbook/test reference.

#### B. Rewrite mixed local/cloud tooling to cloud-only

Inspect before deleting. Preserve legitimate cloud behavior while removing local SQLite branches from current equivalents of:

- `migrate-r2-image-public-url.ts`;
- `migrate-r2-cloud-folders.ts`;
- `strip-product-image-urls.ts`;
- `reset-advertisements-db.ts`;
- `drop-factory-reset-tables.ts`;
- `enforce-notification-token-cardinality.ts`;
- `verify-turso-shards.ts`.

Examples:

- R2 reference migrations should update Turso only and use storage-core for R2 access.
- `verify-turso-shards` should compare Turso with desired-schema manifests/ownership, not local shard files.
- A destructive cloud reset/drop command may remain only if it is an intentionally authorized cloud operation with loud confirmation/guarding; remove the obsolete local sibling/flag.

#### C. Preserve cloud-to-cloud tooling

Do not remove tools merely because they are database migrations. Preserve/refactor legitimate Turso-to-Turso or cloud-only commands such as product/profile/order account migrations, phone normalization, Vercel env publishing, and other cloud maintenance that does not depend on a local application DB.

### Remove filesystem database artifacts

Delete `public/sync_data/sync_sqlite/**`, staged/replacement remnants, obsolete `.gitkeep` files, and ignore rules whose sole purpose is those runtime DB files.

Remove every code path that recreates the directory during dev, app initialization, build, test setup, provisioning, or release.

Schema-sync JSON reports may remain under `public/sync_data` only if they are still intentionally used and renamed to desired-schema terminology. Do not delete unrelated generated/public data just because it shares the parent directory.

### Dependency and service-stub cleanup

After production/tooling imports are gone:

1. Remove `better-sqlite3` from production dependencies and `next.config.ts` server externals/tracing.
2. Remove isolated-service `better-sqlite3` aliases/stubs and composition comments that exist solely to prevent unreachable SQLite code from bundling.
3. Refactor/remove the architecture contract that requires those stubs. Replace it with a simpler source contract: service/runtime production closures must contain no `better-sqlite3` import.
4. Update `service-mirror-core` logic that manufactures those stubs.
5. Keep deployment artifact guards that assert native SQLite binaries are absent if they remain useful as negative protection.
6. If test-only SQLite remains, move `better-sqlite3` from root production `dependencies` to `devDependencies` together with `@types/better-sqlite3`, restrict imports to approved test files/temp paths, and ensure production/service installation does not require its native binary. If no isolated test still needs it, remove both packages completely.
7. Rework repository install/release tooling that currently treats `better-sqlite3` as a required production native binary. Re-verify and remove obsolete handling from current equivalents of `scripts/install-compatible-dependencies.mjs`, `scripts/run-remote-deploy-all.mjs`, `scripts/check-environment-requirements.ts`, package `allowScripts`, runtime-compatibility fingerprints, and their tests/docs. The remote deploy sandbox must no longer run `verify-sqlite-runtime.ts`.
8. If `better-sqlite3` remains test-only, do not require/approve its lifecycle script in a production-only installation path merely for tests that are not executed there. Keep the production dependency doctor focused on binaries the release runtime/build actually needs.

---

## 8. Phase E — Make Development Image Storage R2-Only

### Goal

Server-side image persistence in Development must resolve through the storage profile's real R2 account exactly as in release runtimes. The browser still uses the existing API/orchestrator/cache pipeline.

### Provider changes

1. Remove the Development override in `packages/storage-core/src/server/providers/provider-resolver.ts` that returns `localStorageProvider`.
2. Remove `LocalStorageProvider`, `localStorageProvider`, and their exports after all callers are gone.
3. Remove `LocalStorage` from `StorageProviderId`, validators, provider-id tests, metadata assumptions, and docs.
4. Remove `isLocalDevelopmentRuntime()` if it has no remaining responsibility after provider selection is profile-driven in every runtime.
5. Keep `CloudflareR2`, `CloudflareR2Products`, and dynamic `CloudflareR2_<account>` resolution and target-integrity validation.
6. Do not collapse R2 accounts. Preserve general media, legacy products, apparel/pets products, and OTA ownership boundaries. OTA remains owned exclusively by `@asol/ota-core`.
7. Preserve `ImageStorageOrchestrator`, storage profile IDs, image-key generation, folder strategy, compression, upload queue, replacement/delete semantics, and storage-core ownership.
8. Missing/mismatched R2 configuration in Development must fail with the same account-specific integrity behavior as cloud runtimes. Never fall back to disk or another account.
9. Update `packages/architecture-core/src/contracts/image-storage-contract.ts` and storage-core architecture checks so the invariant becomes "no filesystem image provider / no direct provider bypass", not a rule that assumes `LocalStorageProvider` exists.

Do not rename persisted/transport metadata such as `filePathOrProviderId` merely because its name reflects historical local/cloud duality. It currently carries cloud object-path information too. Renaming it is a separate data-contract migration and is out of scope unless the implementation proves it is non-persisted or separately migrates every Turso consumer under explicit authorization.

### Canonical folder migration

Current profiles have both `folder` (old local prefix) and `cloudFolder` (R2 prefix). The final configuration should have one canonical object prefix where possible, but key stability is mandatory.

If the duplicate fields are collapsed:

1. For each profile, set the surviving canonical folder to the **current cloud value**: `cloudFolder ?? folder`.
2. Then remove `cloudFolder`, not the other way around.
3. Preserve these current R2 prefixes exactly unless a separately authorized R2 migration changes them:
   - avatar -> `images/profile/avatars`;
   - cover -> `images/profile/covers`;
   - home hero slider -> `images/content/advertisements/home-hero-slider`;
   - special order -> `images/content/spicialOrder`;
   - product default -> `images/products`;
   - apparel/pets products -> `images/products-apparel-pets`.
4. Preserve `folderStrategy: "main-category"` and the fact that the category/scope is part of `imageKey`, not a second provider decision.
5. Update `storageFolderForProvider`, reverse object-path/profile resolution, validators, tests, and migration tooling atomically.
6. Remove `storageFolderCandidates()` only after all legitimate migration/reference consumers are rewritten. Data Health consumers disappear with the feature.

Do not rewrite persisted `imageKey` values simply because the config representation is simplified. The orchestrator constructs object paths as canonical folder + existing image key.

---

## 9. Phase F — Preserve AsolDB Image Caching While Removing Filesystem Image Storage

### Required preservation

Keep the remote-image read pipeline:

```text
render request -> memory -> AsolDB imageCache -> conditional HTTP/R2 download
```

Preserve:

- `packages/data-core/src/browser/image-cache/**`;
- `ASOL_DB_STORES.IMAGE_CACHE`;
- `packages/storage-image-manager-core/src/services/local-first-image-cache.ts`;
- ETag/304 revalidation;
- stale cached Blob fallback on transient/offline failure;
- in-flight request deduplication;
- bounded cache pruning;
- invalidation on replacement/deletion;
- `imageUploadDrafts` persistence and FIFO upload-queue recovery.

The term `local-first` in this browser cache means **client cache lookup first**. It does not mean filesystem object storage and is not a deletion target.

### Remove filesystem-local uploaded-image paths

After R2 provider resolution is live and verified, remove runtime ownership of:

- `public/sync_data/sync_file/images/**`;
- local image path resolvers/public URL builders in `@asol/dev-core`;
- local image provider metadata;
- local-storage branches in image inventories/migrations that remain after Data Health deletion.

Do not delete fixed application assets, pharmacy fixed images, branding assets, static public assets, or any other repository asset that is not uploaded/user-generated storage.

### Existing local uploaded images: loss-prevention procedure

Before deleting files under `public/sync_data/sync_file/images/**`:

1. Inventory every local file with path, hash, size, and modification time.
2. Build an explicit legacy-local-prefix -> canonical R2-prefix map **before** removing the old `folder/cloudFolder` distinction.
3. Find database references to uploaded images through the current canonical image-reference rules. Do not treat every local file as live.
4. For each still-referenced image, derive the storage profile and current R2 object path from the persisted `imageKey`/`storageProfileId` rules.
5. Perform a read-only `exists`/metadata check against the correct R2 account when authorized.
6. If the R2 object exists, the local file is only a redundant server copy and may be deleted after verification.
7. If a referenced object is missing from R2 but the local file exists, classify it as migration-required. Do **not** delete it.
8. If cloud writes are separately authorized, upload migration-required objects through storage-core to the exact existing key/profile target, verify them, then remove local copies.
9. Orphaned local files may be deleted only after confirming they have no live reference and are not required fixed assets.
10. Produce a migration/inventory report during implementation; do not leave a runtime local-storage fallback for unresolved files.

### AsolDB tests

Explicitly test that after filesystem removal:

- a fresh remote image downloads through the normal HTTP port and is persisted to AsolDB;
- a cached image renders without a second cloud request while fresh;
- ETag revalidation still works when stale;
- stale Blob fallback still works on transient network failure;
- replace/delete invalidates the cached identity;
- upload drafts survive navigation/reload exactly as before.

---

## 10. Phase G — Remove Data Health Completely

The deletion target is the capability, not only the visible page.

### Application surfaces

Delete after re-verification:

- `src/app/dev/data-health/**`;
- `src/app/super-admin/data-health/**` redirect/alias;
- `src/app/api/super-admin/data-health/**` and every nested plan/cleanup/quarantine/schema/history/order-purge route;
- `src/features/data-health/**`;
- `scripts/test-data-health-environment.ts`;
- any navigation, route registry, redirect, label, badge, permission, page-save scope, or static-pruning entry that exists for Data Health.

### Capability/package ownership

Delete:

- `packages/data-core/src/domains/data-health/**`;
- the `@asol/data-core/data-health` export door;
- `packages/data-health-core/**`.

The deep-plan audit found no independent package responsibility outside Data Health. Still run the final reference sweep immediately before deletion to catch changes made after this plan was authored; a newly introduced legitimate consumer is a conflict to resolve, not a reason to leave a half-deleted feature.

Remove `@asol/data-health-core` and `@asol/data-health-core/server` from data-core/package dependency allowlists and capability registries. Remove its release/runbook entry (`test:data-health-core`), deployment artifact gate entry, and package test script together with the package.

### Database/schema ownership

1. Remove all `data_health_*` table declarations from `DATABASE_SHARDS["system-ops"]`.
2. Remove Data Health metadata DDL/current-schema ownership from data-core.
3. Remove Data Health table exemptions from `account-deletion-registry.persistence.ts`; they are stale once the tables are no longer application-owned.
4. Remove Data Health table expectations from image-source registries, schema tests, table ownership maps, tooling, and desired-schema manifests.
5. Keep `system_logs` and `control_release_state` in `system-ops`.
6. Do **not** issue `DROP TABLE data_health_*` as part of this code refactor. Historical remote tables/rows may remain as unowned cloud residue until a separately authorized cleanup task removes them.
7. Schema sync must tolerate those remote extras in non-exact mode while proving all desired objects are present.

### Cross-feature cleanup

Remove Data Health-specific references from:

- application/capability registries;
- developer/super-admin navigation;
- `@asol/page-save-core` scope fixtures/registries/tests;
- release/verify-all/related-core-test inventories;
- service/control route mirrors and adapters;
- account bridge/generated route inventories;
- TypeScript path aliases or service package maps;
- deployment artifact/package allowlists;
- DOM identity generated manifests;
- editable documentation.

Delete `docs/06-super-admin-and-operations/data-health-module.md`. Regenerate generated knowledge instead of hand-editing it.

---

## 11. Phase H — Remove Dev Cloud Backup Completely

The deletion target is the full capability and its code-owned local archive lifecycle.

### Application surfaces

Delete after re-verification:

- `src/app/dev/dev-cloud-backup/**`;
- `src/app/super-admin/dev-cloud-backup/**` redirect/alias;
- `src/app/api/super-admin/dev-cloud-backup/**` including create/inspect/compare/update/download/restore/delete endpoints;
- `src/features/dev-cloud-backup/**`;
- navigation, route registry, page-save scope, static-pruning, permissions, labels, and tests owned solely by this feature.

### Capability/data ownership

Delete:

- `packages/data-core/src/domains/dev-cloud-backup/**`;
- the `@asol/data-core/dev-cloud-backup` export door;
- `packages/backup-core/**`.

The deep-plan audit found no independent capability responsibility outside Dev Cloud Backup. Re-run the reference sweep immediately before deletion only to detect later repository changes.

Remove the corresponding package dependencies/allowlists/registry entries and root scripts `test:dev-cloud-backup` / `test:backup-core`. Remove the `test:backup-core` Android/release-runbook entry and deployment artifact gate entry together with the package.

### Archive safety

The code path that creates/manages `.backups/dev-cloud/` must disappear. However existing zip files are user-created recovery artifacts, not dead source code.

During implementation:

1. Inventory `.backups/dev-cloud/*.zip` without opening credentials or restoring anything. The plan-review snapshot had zero files, but execution must not assume it stayed empty.
2. Do not execute merge/replace restore.
3. Do not delete archives merely to make a zero-reference/path check pass.
4. Remove runtime code, APIs, ignore/config entries, and UI ownership for the archive lifecycle.
5. Report remaining archive files separately so the user can explicitly choose retention, external archival, or deletion.

### Registries/generated surfaces

Remove Dev Cloud Backup from application/capability registries, developer navigation, page-save fixtures, release/verify-all inventories, deployment gates, control service routes/adapters, service mirror aliases, static-export pruning lists, and generated knowledge.

Delete `docs/02-data-and-storage/dev-cloud-backup-module.md`. Update editable docs that reference the feature as active; regenerate generated documentation rather than editing it by hand.

---

## 12. Phase I — Clean Registries, Services, Generated Artifacts, and Dependency Graph

After source ownership changes:

1. Update `packages/architecture-core/src/registry/capability-registry.ts` for removed packages/vendor/runtime ownership.
2. Update `packages/architecture-core/src/registry/application-features-registry.ts` for removed Data Health and Dev Cloud Backup features.
3. Update `@asol/data-core` `exports`, its pinned expected-door test, declared package-door allowlist, package dependencies, and domain-directory invariants.
4. Remove obsolete `@asol/data-health-core`, `@asol/backup-core`, and local SQLite package edges.
5. Remove `forceRemoteDataSource`/SQLite deployment workarounds from all composition roots once Turso-only behavior is universal.
6. Remove service-mirror generation of `better-sqlite3` stubs and delete existing generated stubs through `npm run services:sync`, not manual mirror edits.
7. Refactor architecture checks that currently require those stubs so they assert the new invariant: production/service closures cannot reach a local SQLite driver.
8. Update generated gate policy and deploy runbook ownership for removal of `db:ensure` and removed feature tests.
9. Update `verify:all`, related-core-test selection, release command inventories, deployment artifact gates, and package-count/door-count assertions.
10. Regenerate service mirrors using `npm run services:sync`, then run `npm run services:verify`.
11. Regenerate static DOM identity/source manifests from source after the two UI features disappear.
12. Regenerate generated documentation/knowledge with the owning generator. Never hand-edit `docs/09-agent-knowledge/generated/**`.
13. Update runtime-compatibility references/fingerprints only through their owning workflow when dependency or lockfile changes require it.
14. Remove stale `.next`, service build, or scratch artifacts from verification inputs; never treat them as source.

### Required dependency outcome

- Runtime `@asol/data-core` has no dependency on `@asol/dev-core` for SQLite/filesystem paths.
- Runtime/build/provisioning `@asol/data-core` has no `better-sqlite3` dependency.
- `@asol/data-core/browser` remains intact and continues to own TanStack Query persistence and AsolDB image-cache primitives.
- `@asol/storage-core` remains the exclusive image-object storage owner and is R2/profile-driven in Development and release runtimes.
- No production package depends on removed `@asol/data-health-core` or `@asol/backup-core`.
- Test-only SQLite, if retained, is isolated from production/tooling closures and repository persistence paths.

---

## 13. Documentation Changes Required During Implementation

Update editable documentation in the same implementation change so it describes cloud-only Development and SQLite-independent provisioning.

At minimum re-evaluate/update:

- `docs/02-data-and-storage/central-data-access.md`;
- `docs/02-data-and-storage/cache-rules-and-data-flow.md`;
- `docs/02-data-and-storage/current-databases.md`;
- `docs/02-data-and-storage/database-schema-compatibility.md`;
- `docs/02-data-and-storage/schema-provisioning.md`;
- `docs/02-data-and-storage/dev-core-module.md`;
- `docs/02-data-and-storage/environment-variables.md`;
- `docs/02-data-and-storage/profile-system.md`;
- `docs/02-data-and-storage/product-data-model.md` where it names local DB paths;
- `docs/02-data-and-storage/image-storage/image-storage-system.md`;
- `docs/02-data-and-storage/image-storage/image-storage-architecture-contract.md`;
- `docs/02-data-and-storage/image-storage/r2-storage.md`;
- `docs/03-products-and-commerce/marketplace-order-management/11-special-order-image-storage.md`;
- `docs/04-ui-components/guides/hero-slider-guide.md`;
- `docs/05-platform-features/sealed-packages/data-core-module.md`;
- `docs/05-platform-features/sealed-packages/storage-core-module.md`;
- marketplace-order operation/testing docs that describe `db:ensure` or local shards;
- super-admin/release docs that describe local SQLite setup as a release prerequisite;
- troubleshooting docs that are obsolete if `better-sqlite3` leaves non-test installation/build paths;
- dependency/technology inventory if the dependency classification changes.

Delete the dedicated Data Health and Dev Cloud Backup docs specified above.

Preserve `docs/02-data-and-storage/asol-db-system.md` semantics for `imageCache`, `queryCache`, and `imageUploadDrafts`. Update only stale statements that describe server-side local data as authoritative.

`docs/09-agent-knowledge/runtime-contract.md` currently allows Development differences but does not require local database/storage. Do not edit that protected contract merely for this cutover unless implementation discovers a genuine binding-contract conflict. Protected docs require explicit authorization under `document-mutability.md`.

Never hand-edit generated docs. Update source/registry facts and run `npm run docs:generate` / the owning generator.

---

## 14. Tests to Add or Rewrite

The implementation is incomplete without mechanical regression protection.

### Runtime/context and database policy

Rewrite `test:runtime-context` and `database-runtime-policy.test.ts` so they prove:

- Development remains a Development deployment/runtime classification;
- Development no longer implies `dataSource: local`;
- no supported server runtime chooses a filesystem database backend;
- static/native/browser execution still cannot access server database clients directly;
- missing Turso credentials fail closed at server access;
- profile/order shards select declared Turso credentials in Development;
- `ASOL_DATA_SOURCE=local` cannot re-enable SQLite and is removed if obsolete.

Delete `test:sqlite-reconnect` and `cached-sqlite-connection.test.ts` when the runtime connection cache they test is deleted.

### Data-core package contract

Rewrite the root `test:data-core` script and `packages/data-core/src/tests/index.test.ts` so they no longer invoke or expect:

- `test:data-health-core`;
- `test:backup-core`;
- `test:sqlite-reconnect`;
- `./data-health` export door;
- `./dev-cloud-backup` export door;
- `@asol/data-health-core` / `@asol/backup-core` package edges;
- runtime `@asol/dev-core` SQLite path edges.

Keep the sealed-package/browser-door/TanStack/AsolDB/vendor-boundary assertions that remain valid.

### Desired schema and provisioning

Add tests proving:

- every logical DB/shard has a desired-schema manifest;
- table ownership is unique and complete;
- all desired manifests load without a local DB engine;
- `system-ops` contains retained operational tables and excludes `data_health_*`;
- order trigger/constraint inventory is preserved;
- schema diff/report terminology is desired/source vs Turso, not SQLite vs Turso;
- read-only verification performs no DDL;
- release schema apply performs only allowed DDL and re-reads for residual drift;
- provisioning never contains `DROP TABLE`/`DELETE FROM`/local-row-copy behavior as part of ordinary DB creation;
- existing databases are not reseeded from local state;
- `db:ensure` is absent from build/release gate policy.

A static/source test should fail if provisioning imports `better-sqlite3`, a local SQLite path helper, or `public/sync_data/sync_sqlite`.

### Storage provider policy

Rewrite `packages/storage-core/src/tests/integration/parameterized-store.test.ts` and related tests so:

- Development resolves each configured R2 provider, not `LocalStorageProvider`;
- missing account credentials fail for the correct account;
- cross-account fallback remains forbidden;
- canonical folder values equal the current cloud prefixes after config simplification;
- `LocalStorage` is not a supported server storage provider;
- no server upload path writes beneath `public/sync_data/sync_file/images`.

Rewrite `packages/data-core/src/domains/marketplace-orders/tests/storage-profile-integration.test.ts`. It currently asserts both local and cloud folders and requires `public/sync_data/sync_file/images/spicialOrder` to exist. The final test must assert only the canonical R2 prefix `images/content/spicialOrder`, provider/profile constraints, object-path construction, and attachment validation. It must not touch the filesystem uploaded-image tree.

### AsolDB image cache

Keep and strengthen `test:storage-image-manager-core` / browser cache tests to prove:

- memory -> AsolDB -> network ordering;
- fresh cache hit avoids repeated download;
- ETag/304 revalidation;
- stale fallback on transient failure;
- invalidation on replace/delete;
- upload draft durability/recovery.

Add an explicit contract sentence/assertion: **AsolDB image cache is required; filesystem image provider is forbidden.**

### Removed feature contracts

Delete feature-positive tests/scripts with their owners:

- `test:data-health`;
- `test:data-health-core`;
- `test:dev-cloud-backup`;
- `test:backup-core`.

Update generated gate selection, `verify:all`, related-core-test mapping, and release inventories so deletion of those scripts does not make a generic selector/gate invalid.

Add absence contracts where useful so source/build fails if the removed route directories, feature registry entries, package doors, or package directories are reintroduced accidentally.

Update account-deletion registry tests so they do not expect Data Health exemption rows.

Rewrite `packages/data-core/src/domains/account-deletion/tests/account-deletion-query-schema.contract.test.ts` specifically. It currently opens `public/sync_data/sync_sqlite/*.db`, skips when those files are absent, and tells the operator to run `db:ensure`. The replacement must resolve each referenced table to its logical database owner and validate selected/predicate columns against the new desired-schema manifest. It must always perform the contract check offline and must have no `better-sqlite3`, filesystem DB, or skip-on-missing-shard branch.

Rewrite `packages/data-core/src/domains/account-deletion/account-deletion-registry.coverage.ts` and its tests so user-owned-table/cascade coverage is derived from the final desired-schema manifests and FK metadata, not from concatenated historical migration SQL. Historical migrations can contain dropped/renamed/intermediate tables and must not define current account-deletion coverage.

### Test-only SQLite boundary

If any isolated tests still import `better-sqlite3`:

- keep imports under approved test files only;
- use `:memory:` or OS temporary directories, never repository application paths;
- do not load real cloud credentials;
- do not include the driver in production/service build closures;
- add an architecture test that fails on any non-test import.

Prefer existing fakes/test clients when they provide equivalent coverage, but do not replace deterministic unit tests with mutations against real Turso.

---

## 15. Required Verification Sequence

Run focused tests after each ownership change, then the complete non-publishing gate set.

### Before deleting local schema/image artifacts

Run targeted baseline checks that prove the replacement paths are already functional. Do not delete `.db` or local uploaded-image files while callers still depend on them.

### Minimum final targeted sequence

The following scripts exist in the current repository and must either remain valid or be deliberately rewritten by this task:

```bash
npm run test:runtime-context
npm run test:api-core
npm run test:data-core
npm run test:storage-core
npm run test:storage-image-manager-core
npm run test:r2-storage
npm run test:dev-core
npm run test:architecture-core
npm run test:page-save-core
npm run test:release-core
npm run test:gova-deployment-core
npm run test:deployment-tools
npm run test:compositions
npm run services:sync
npm run services:verify
```

Also run the account-deletion registry/schema tests because Data Health table exemptions are removed.

Do **not** run the deleted Data Health/Backup/SQLite reconnect scripts after their owners are intentionally removed; verify instead that `test:data-core`, generated test gates, and related-test selection no longer reference them.

### Cross-runtime and documentation gates

```bash
npm run typecheck
npm run lint
npm run architecture:check
npm run runtime:check:changed
npm run runtime:check
npm run runtime:check:dev
npm run runtime:check:web
npm run runtime:check:static
npm run runtime:check:android
npm run runtime:check:ios
npm run docs:generate
npm run docs:ci
```

`services:sync` and `docs:generate` intentionally regenerate owned outputs; inspect the resulting diff and never hand-edit those generated files.

### Server build

Run `npm run build` when implementation is ready for the complete Web/server build gate **after** generic build has been made free of local DB preparation and unintended cloud schema mutation.

Do not run `npm run build:static` merely as a generic check because it overwrites release `out/`. Static/Android/iOS compatibility is proved by their runtime checks unless the execution task separately authorizes the release build flow.

### Cloud verification

When cloud-read access is available, perform non-destructive checks that:

- all required Turso DBs/shards are reachable;
- Development browser data calls resolve to declared remote service origins;
- server Development repository access uses Turso when exercised;
- every active R2 storage profile resolves to its declared account and current cloud prefix;
- still-referenced uploaded images exist in the expected R2 target before local copies are deleted;
- desired-schema verification reads Turso without local `.db` input.

DDL application, object upload/delete, table drop, data rewrite, provisioning, restore, commit/push, and deployment remain separately authorized effects. A missing authorization must produce a blocker/report, not an implicit mutation.

---

## 16. Final Zero-Reference and Ownership Sweeps

Run repository-wide searches excluding `node_modules`, `.next`, `out`, temporary build caches, unrelated external worktrees, and generated outputs when first classifying source ownership. Then regenerate and verify generated outputs separately.

### Must have zero live runtime/config references

Search for at least:

```text
LocalStorageProvider
localStorageProvider
providerId = LocalStorage
public/sync_data/sync_file/images
public/sync_data/sync_sqlite
LOCAL_SQLITE_SEGMENT
PRIMARY_SQLITE_DB_PATH
resolveSqliteDirectory
resolveLocalImagesRoot
buildLocalSyncFilePublicUrl
sqliteFileNameForShard
ASOL_DATA_SOURCE=local
backend === "sqlite"
CachedSqliteConnection
executeSqlite(
/dev/data-health
/super-admin/data-health
/api/super-admin/data-health
@asol/data-health-core
@asol/data-core/data-health
/dev/dev-cloud-backup
/super-admin/dev-cloud-backup
/api/super-admin/dev-cloud-backup
@asol/backup-core
@asol/data-core/dev-cloud-backup
```

There must be no live source/config/package/route ownership that keeps those behaviors/capabilities active.

### `better-sqlite3` requires classification, not blind zero matches

Every remaining `better-sqlite3` match must be one of:

- an approved isolated test-only import using memory/temp storage;
- a negative architecture/deployment guard that asserts it is absent from production;
- historical documentation intentionally retained and clearly non-current.

There must be **zero** runtime, application, build, provisioning, schema-sync, cloud-maintenance, service composition, or service-mirror dependencies on it.

### Expected SQLite-dialect matches

Matches for `sqliteTable`, `drizzle-orm/sqlite-core`, SQLite-compatible SQL syntax, or historical migrations are allowed and expected because Turso/libSQL uses that dialect. Do not delete them to satisfy a string search.

### Data Health table sweep

Search `data_health_` separately. The final application source, desired schema, shard ownership map, account-deletion exemptions, registries, routes, and tests must have zero active Data Health ownership. If remote Turso still contains historical tables, that is a cloud-state cleanup item, not a source-tree failure.

### Backup archives

A remaining `.backups/dev-cloud/*.zip` file is not a feature-code reference. Report it as retained user data. No runtime code/API/package may still manage it.

---

## 17. Acceptance Matrix

The task is complete only when every row is true:

| Area | Required final state |
| --- | --- |
| Development browser Business API transport | Same canonical route-owner + deployed-origin contract as Static/Android/iOS; no normal dependency on local service ports |
| Development server application DB | Turso/libSQL only |
| Development writes | Normal app CRUD targets the selected remote cloud environment; no hidden local sandbox/fallback |
| Runtime backend selector | No local SQLite option/fallback |
| `ASOL_DATA_SOURCE=local` | Removed / cannot select a local backend |
| `@asol/dev-core` | Retained only for Development-tooling guards; no DB/image/schema-report path ownership |
| Filesystem SQLite runtime | Absent |
| Filesystem SQLite build/provisioning dependency | Absent |
| `public/sync_data/sync_sqlite` | Absent and not regenerated |
| Desired schema source | Repository-owned, SQLite-engine-independent manifest per logical database |
| Runtime schema authority | Repositories are data-only; no lazy CREATE/ALTER owner duplicating manifests |
| Runtime data migrations | Explicit/guarded and separate from schema manifests; system-log backfill preserved if needed |
| Schema terminology | desired/source schema vs Turso, not SQLite vs Turso |
| Generic build | No `db:ensure`; no unintended cloud DDL mutation |
| Release schema apply | Explicit manifest -> Turso DDL step with residual read-back verification |
| Turso provisioning | Creation/credentials/schema only; no table wipe or local-row copy |
| Data preservation | Existing Turso rows never overwritten from local SQLite |
| Development uploaded-image provider | Configured Cloudflare R2 profile provider |
| Filesystem image provider | Absent |
| `public/sync_data/sync_file/images` application storage | Absent after loss-prevention verification |
| R2 object prefixes | Preserve current cloud paths exactly unless separately migrated |
| AsolDB | Preserved |
| AsolDB `imageCache` | Preserved and tested |
| AsolDB `queryCache` | Preserved and tested |
| AsolDB `imageUploadDrafts` | Preserved and tested |
| `/data-health` capability/route family | Absent from source ownership |
| `data_health_*` desired schema/routing ownership | Absent |
| Historical remote Data Health tables | Not auto-dropped by this refactor |
| `/dev-cloud-backup` capability/route family | Absent from source ownership |
| Existing backup ZIP files | Not silently destroyed; reported separately |
| `@asol/data-core` export/edge set | No removed feature doors; browser/cache doors intact |
| Service mirrors | Regenerated; no SQLite stubs required by production closure |
| Test-only SQLite | Optional, isolated to tests only; never application persistence |
| Editable docs | Updated to cloud-only Development and desired-schema provisioning |
| Generated docs/catalogs | Regenerated, not hand-edited |
| Five runtime checks | Green |
| Architecture/type/lint/docs gates | Green |
| Server build | Green after build is free of local DB preparation/unintended cloud writes |

---

## 18. Forbidden Shortcuts

The implementing agent MUST NOT:

- keep SQLite behind a renamed `local`, `development`, `fallback`, `legacy`, or environment-only switch;
- keep `LocalStorageProvider` as an undocumented emergency path;
- delete AsolDB `imageCache`, `queryCache`, or `imageUploadDrafts` to satisfy "no local storage";
- delete `sqliteTable(...)`/SQLite dialect schema declarations merely because the local DB engine is removed;
- use a temporary file SQLite DB, in-memory SQLite, embedded libSQL DB, or hidden shadow DB as the permanent desired-schema compiler;
- replay historical migrations into a local database at build time to reconstruct desired schema;
- treat historical migration files alone as a verified current-state manifest when DROP/RENAME/ALTER history can make naive concatenation incorrect;
- run the old `provisionDatabaseShards()` and accept its Turso DROP/DELETE/local-row-copy behavior;
- make generic `npm run build` mutate Turso merely because local DB preparation was removed;
- keep repository-level `ensureSchema()` DDL as a second schema source after manifests become authoritative;
- delete the system-log legacy-origin row backfill without either proving it is no longer needed or moving it to an explicit idempotent data migration;
- route browser UI directly to Turso/R2 credentials instead of existing API/storage boundaries;
- collapse route-owner services into one API origin for convenience;
- collapse R2 accounts or silently fall back from a missing account to another account;
- replace `cloudFolder` by the old local `folder` value and thereby change live object keys;
- delete a referenced local image before verifying its correct R2 copy;
- upload orphan local files to R2 without proving they are still referenced;
- convert deterministic unit tests into writes against real Turso simply to remove `better-sqlite3` from devDependencies;
- leave Data Health hidden while its APIs/package/tables-as-code/registries remain active;
- auto-drop historical `data_health_*` Turso tables without separate destructive-cloud authorization;
- leave Dev Cloud Backup hidden while its restore/archive APIs/package remain active;
- delete existing backup ZIPs as a side effect of deleting feature code;
- hand-edit service mirrors or generated documentation;
- weaken architecture/runtime/docs checks to make stale deleted references pass;
- reset/revert unrelated user changes;
- commit, push, deploy, restore, provision, or mutate cloud state without the authorization required for that effect.

The final architecture must be simpler in one specific way: **one cloud server-side source of truth, one remote client transport contract, no persistent local server database/image-provider duplicate, while AsolDB remains the deliberate client-side cache/persistence layer.**
