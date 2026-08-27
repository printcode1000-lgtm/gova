# Gova Project Knowledge Base Index

## Overview

**Gova** (package name: `asol`) is a multi-tenant marketplace platform architected as a modular monorepo supporting **5 global runtime targets**: Development, Web (Next.js server-capable), Static `out/`, Android (Capacitor), and iOS (Capacitor).

The codebase is organized into **41 sealed packages** under `packages/`, **47 application features** under `src/features/`, and **6 standalone microservices** under `services/`.

## Knowledge Modules

| Module | Contents |
|---|---|
| [architecture.md](./architecture.md) | High-level system architecture, 5 runtime targets, layered application stack, microservices isolation, mandatory gateways, and core invariants. |
| [packages.md](./packages.md) | Comprehensive inventory of all 41 packages across 5 layers (Capability, Composition, Declarations, Bridge, Enforcement) with doors, owners, and responsibilities. |
| [dependencies.md](./dependencies.md) | Cross-package dependency directions, allowed boundaries, vendor SDK exclusivity rules, and anti-circularity constraints. |
| [runtime-flows.md](./runtime-flows.md) | Detailed end-to-end execution flows: UI interaction, authentication, service bridge routing, notification grants, page persistence, media upload, static bundle generation, and OTA updates. |
| [data-flows.md](./data-flows.md) | Multi-database sharding topology (Turso/SQLite), Drizzle ORM usage, Cloudflare R2 object storage hierarchy, client cache layers, and sync paths. |
| [conventions.md](./conventions.md) | Strict coding and architectural conventions: Single Responsibility Principle, Touch-Only UI policy, UI Attribute System, Port-Adapter wiring, test release gates. |
| [decisions.md](./decisions.md) | Key Architectural Decision Records (ADRs): zero backend-to-backend calls, HMAC notification grants, browser bridges, local script release gates. |
| [risks.md](./risks.md) | High-risk operational areas: static bundle overwrites, multi-account Turso schema provisioning, native Capacitor plugin sync, and secret archive management. |
| [unresolved.md](./unresolved.md) | Active architectural tracking log, pending native capability baselines, and areas earmarked for deeper investigation. |

## Core System Invariants

1. **Five Runtime Surfaces**: Every non-dev change must be evaluated against Development, Web, Static `out/`, Android, and iOS.
2. **Sealed Package Boundaries**: Imports into `packages/*` must strictly use `exports` declared in `package.json`. No deep imports or relative escapes.
3. **Mandatory Gateways**: Database (`@asol/data-core`), Object Storage (`@asol/storage-core`), Native (`@asol/native-core`), Page Writes (`@asol/page-save-core`), Push (`@asol/notifications-core`), OTA (`@asol/ota-core`).
4. **Touch-First UI**: Never use hover styles (`hover:`, `group-hover:`, `:hover`), pointer cursors (`cursor-pointer`), or DOM `title` attributes in application source.
5. **Zero Cross-Service Backend Calls**: Deployed microservices under `services/` never communicate backend-to-backend; routing happens via client-side bridges (`service-bridge`, `notification-bridge`).
6. **Local Gates Gate Releases**: Releases are guarded by local verification scripts (`npm run architecture:check`, `npm run docs:ci`, `npm run runtime:check`) rather than CI workflows.
