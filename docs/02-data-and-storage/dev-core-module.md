# `@asol/dev-core` Architecture & Consolidation

## Purpose

Preserved operational and architectural detail, relocated here during the 2026-08 architecture reconstruction. Agents use this for implementation guidance.

## Scope

See sections below. Architectural relationships defer to [docs/01-architecture/README.md](../01-architecture/README.md) where applicable.

---

## 1. Summary & Core Mission

`@asol/dev-core` is the sealed workspace package that owns one thing: **deciding
whether the current runtime is a developer's machine**, so developer-only tooling
can refuse to run on Vercel, during a static export, or in a production build.

Located at `packages/dev-core/`, it owns no data. It used to also own the local
development *data* contract — path segments under `public/sync_data/`, SQLite
filename constants, shard file naming, and the public URL a locally stored image
was served from. None of that exists any more: server application data is Turso
and image objects are Cloudflare R2 in every runtime, Development included.

General deployment/runtime detection remains in `src/core/config/runtime-context*.ts`. `dev-core` adds narrower predicates on top of that context.

---

## 2. Package Boundaries & Public Surface

`@asol/dev-core` exposes exactly two sealed entry points:

| Door | Import | Safe for | Contents |
| :--- | :--- | :--- | :--- |
| Browser / shared | `@asol/dev-core` | Client bundles, shared constants | Development-runtime predicates and assertions |
| Server | `@asol/dev-core/server` | API routes, scripts, server modules | The same predicates plus `readLocalDevelopmentRuntimeFromProcess` |

**Do not** deep-import from `packages/dev-core/src/**`. Use only the two doors above, per [module-isolation-rules.md](../01-architecture/02-packages/module-isolation-rules.md).

---

## 3. What This Package Owns

| Concern | In `@asol/dev-core` | Where it lives instead |
| :--- | :--- | :--- |
| `isLocalDevelopmentRuntime` / `isStrictLocalDevelopmentRuntime` | yes | — |
| `assertLocalDevelopmentAllowed` / `assertStrictLocalDevelopmentAllowed` | yes | — |
| `readLocalDevelopmentRuntimeFromProcess` | yes (`/server`) | `getServerRuntimeContext()` in `core/config` |
| Server database access | — | `@asol/data-core` (Turso only, every runtime) |
| Desired schema and provisioning paths | — | `@asol/data-core/provisioning` |
| Image object storage | — | `@asol/storage-core` (Cloudflare R2, every runtime) |
| Dev UI (`/dev/*`, catalog studio) | — | `src/app/dev`, `src/features/*` |

A test in this package (`runNoLocalPersistenceOwnershipTest`) fails if any of the
removed names reappear here. A Development-guard package that knew where a
database file lived would be an invitation to put one back, and that is exactly
how the first local backend stayed invisible.

---

## 4. Guard Levels

| Helper | Use when |
| :--- | :--- |
| `isLocalDevelopmentRuntime` | Feature is allowed whenever `runtime.isDevelopment` is true |
| `isStrictLocalDevelopmentRuntime` | Tool must not run on Vercel, during static export, or in Next production-build phase |

App modules pass runtime through `readLocalDevelopmentRuntimeFromProcess(getServerRuntimeContext())` so `dev-core` never imports `@/core/config`.

A Development guard controls whether a *tool* may run. It says nothing about
where data lives — Development reaches the same Turso databases and the same R2
buckets as any deployed runtime.

---

## 5. Measured Rule 7

`@asol/dev-core` imports **nothing** from other `@asol/*` packages or the
application, and nothing imports it for a path. `@asol/storage-core`'s former
edge into `@asol/dev-core/server` existed only for the filesystem image
provider's local paths and is gone with it.

---

## 6. Verification

```bash
npm run test:dev-core
npm run typecheck
npm run architecture:check
```

`test:dev-core` gates `build`, `build:static`, and `test`.
