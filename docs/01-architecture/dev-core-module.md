# `@asol/dev-core` Architecture & Consolidation

## 1. Summary & Core Mission

`@asol/dev-core` is the sealed workspace package that owns the **local development data contract** for ASOL: canonical paths under `public/sync_data/`, SQLite filename constants, shard file naming, development-only runtime predicates, and shared guards.

Located at `packages/dev-core/`, it does **not** own SQLite clients, Drizzle schemas, dev UI pages, or cloud backup tooling. Those stay in `data-access`, `features/`, and `modules/` and consume this package for paths and guards.

General deployment/runtime detection remains in `src/core/config/runtime-context*.ts`. `dev-core` adds narrower predicates on top of that context.

---

## 2. Package Boundaries & Public Surface

`@asol/dev-core` exposes exactly two sealed entry points:

| Door | Import | Safe for | Contents |
| :--- | :--- | :--- | :--- |
| Browser / shared | `@asol/dev-core` | Client bundles, shared constants | Relative path segments, SQLite filenames, `sqliteFileNameForShard`, development predicates, `buildLocalSyncFilePublicUrl` |
| Server | `@asol/dev-core/server` | API routes, scripts, server modules | Absolute path resolvers (`resolveSqliteDirectory`, `resolvePrimarySqlitePath`, …), guard helpers, `readLocalDevelopmentRuntimeFromProcess` |

**Do not** deep-import from `packages/dev-core/src/**`. Use only the two doors above, per [module-isolation-rules.md](./module-isolation-rules.md).

---

## 3. What Moved Into the Package

| Concern | In `@asol/dev-core` | Stays in the app |
| :--- | :--- | :--- |
| `public/sync_data/sync_sqlite` path segments | yes | — |
| `public/sync_data/sync_file` path segments | yes | — |
| SQLite filename constants (`allusers.db`, …) | yes | — |
| `sqliteFileNameForShard()` | yes | — |
| `isLocalDevelopmentRuntime` / `isStrictLocalDevelopmentRuntime` | yes | — |
| `readLocalDevelopmentRuntimeFromProcess` | yes (`/server`) | `getServerRuntimeContext()` in `core/config` |
| SQLite DB clients (Drizzle + better-sqlite3) | — | `data-access/core/database` |
| `LocalStorageProvider` implementation | — | `@asol/storage-core` (imports path resolvers from here) |
| `db:ensure` / shard-split tooling | — | `data-access/tooling` (imports paths from here) |
| Dev UI (`/dev/*`, catalog-studio, cloud backup) | — | `src/app/dev`, `src/modules/*`, `src/features/*` |

`src/modules/data-access/core/database/environment.ts` is now a thin adapter: it re-exports resolved absolute paths from `@asol/dev-core/server` and keeps data-access-specific runtime helpers (`isDevRuntime`, provisioning checks).

Development guards in `data-health`, `dev-cloud-backup`, and `google-play-console` call `@asol/dev-core/server` instead of duplicating predicates.

---

## 4. Local Path Layout (single source of truth)

```text
public/sync_data/
├── sync_sqlite/                 ← resolveSqliteDirectory()
│   ├── allusers.db            ← resolvePrimarySqlitePath()
│   ├── product.db
│   ├── advertisements.db
│   ├── notifications.db
│   ├── profile.db             ← schema source (split input)
│   ├── marketplace-orders.db  ← schema source (split input)
│   └── <shard-name>.db        ← resolveShardSqlitePath(name)
├── sync_file/                   ← resolveSyncFileRoot()
│   └── images/                  ← resolveLocalImagesRoot()
└── schema-sync-report.json      ← resolveSchemaSyncReportPath()
```

Public image URLs in local development use `buildLocalSyncFilePublicUrl()` → `/sync_data/sync_file/...`.

---

## 5. Guard Levels

| Helper | Use when |
| :--- | :--- |
| `isLocalDevelopmentRuntime` | Feature is allowed whenever `runtime.isDevelopment` is true (data health, release console pages) |
| `isStrictLocalDevelopmentRuntime` | Tool must not run on Vercel, during static export, or in Next production-build phase (dev cloud backup) |

App modules pass runtime through `readLocalDevelopmentRuntimeFromProcess(getServerRuntimeContext())` so `dev-core` never imports `@/core/config`.

---

## 6. Measured Rule 7

`@asol/dev-core` imports **nothing** from other `@asol/*` packages or the application.

`@asol/storage-core` has **one designated edge** into `@asol/dev-core/server` for local path resolution inside `LocalStorageProvider`.

---

## 7. Verification

```bash
npm run test:dev-core
npm run typecheck
npm run architecture:check
```

`test:dev-core` gates `build`, `build:static`, and `test`.
