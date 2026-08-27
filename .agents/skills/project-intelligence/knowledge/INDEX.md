# Gova Project Knowledge Base Index

## Overview

**Gova** (package name: `asol`) is a multi-tenant marketplace platform architected as a modular monorepo supporting **5 global runtime targets**: Development, Web (Next.js server-capable), Static `out/`, Android (Capacitor), and iOS (Capacitor).

The codebase is organized into **43 sealed packages** under `packages/`, **48 application features** under `src/features/`, **6 standalone microservices** under `services/`, **7 deployment accounts** declared in `@asol/account-declarations`, and **21 databases/shards** (4 standalone/legacy databases + 8 profile shards + 9 marketplace order shards).

## Knowledge Modules

| Module | Contents |
|---|---|
| [architecture.md](./architecture.md) | High-level system architecture, 5 runtime targets, layered application stack, microservices isolation, mandatory gateways, and core invariants. |
| [packages.md](./packages.md) | Comprehensive inventory of all 43 packages across 5 layers (Capability, Composition, Declarations, Bridge, Enforcement) with doors, owners, and responsibilities. |
| [dependencies.md](./dependencies.md) | Cross-package dependency directions, allowed boundaries, vendor SDK exclusivity rules, and anti-circularity constraints. |
| [runtime-flows.md](./runtime-flows.md) | Detailed end-to-end execution flows: UI interaction, authentication, service bridge routing (read/workload partitioning), notification grants, direct mobile push, page persistence, media upload, static bundle generation, OTA updates, and deploy-all resume checkpoints. |
| [data-flows.md](./data-flows.md) | Multi-database sharding topology (Turso/SQLite), Drizzle ORM usage, inode-aware SQLite caching (`CachedSqliteConnection`), Cloudflare R2 object storage hierarchy, client cache layers, and pending UiRegistry queue. |
| [conventions.md](./conventions.md) | Strict coding and architectural conventions: Single Responsibility Principle, Touch-Only UI policy, UID-first UI Attribute System, Overlay Chrome isolation, Port-Adapter wiring, test release gates. |
| [decisions.md](./decisions.md) | Key Architectural Decision Records (ADRs): zero backend-to-backend calls, HMAC notification grants, workload-partitioned microservices (`submain`/`sub2main`), UID-first UI diagnostics, inode-aware SQLite caching, deploy-all resume checkpoints. |
| [risks.md](./risks.md) | High-risk operational areas: static bundle overwrites, multi-account Turso schema provisioning, native Capacitor plugin sync, secret archive management, pending UiRegistry deploy blockers, and stale deploy checkpoints. |
| [unresolved.md](./unresolved.md) | Active architectural tracking log, pending native capability baselines, conditional branch locator matching, and areas earmarked for deeper investigation. |

## Core System Invariants

1. **Five Runtime Surfaces**: Every non-dev change must be evaluated against Development, Web, Static `out/`, Android, and iOS.
2. **Sealed Package Boundaries**: Imports into `packages/*` must strictly use `exports` declared in `package.json`. No deep imports or relative escapes.
3. **Mandatory Gateways**: Database (`@asol/data-core`), Object Storage (`@asol/storage-core`), Native (`@asol/native-core`), Page Writes (`@asol/page-save-core`), Push Notifications (`@asol/notifications-core`), OTA (`@asol/ota-core`), UI Identity (`@asol/ui-registry-core`).
4. **Touch-First UI**: Never use hover styles (`hover:`, `group-hover:`, `:hover`), pointer cursors (`cursor-pointer`), or DOM `title` attributes in application source.
5. **Zero Cross-Service Backend Calls**: Deployed microservices under `services/` never communicate backend-to-backend; routing happens via client-side bridges (`service-bridge`, `notification-bridge`).
6. **UID-First UI Diagnostics**: Every registered page and UI component must carry a unique `data-ui-uid` (`<prefix>-<Base62-suffix>`) minted during development; shared primitives receive per-instance descriptors via `ui` props without generic fallback UIDs.
7. **Overlay Chrome Isolation**: Diagnostic overlays (DevBadge, SuperAdminUiAttributeInspector, Error button) must carry `data-asol-overlay-chrome` and wrap in `DismissableLayerBranch` so they never trigger outside-dismiss on modal dialogs.
8. **Local Gates Gate Releases**: Releases are guarded by local verification scripts (`npm run architecture:check`, `npm run docs:ci`, `npm run runtime:check`, `npm run ui-registry:pending:check`) rather than CI workflows.
