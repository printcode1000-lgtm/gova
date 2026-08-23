# Capability Map

## Purpose

Machine-readable capability ownership reference. Each capability has exactly one authoritative owner package. Agents MUST consult this map before modifying or introducing capabilities.

## Scope

All significant domain and infrastructure capabilities owned by sealed `@asol/*` packages. Application-layer orchestration (UI, hooks, routes) is documented under [Application Layers](../10-application-layers/README.md).

## Source of Truth

This document is the canonical capability ownership map. Other documents MUST link here rather than duplicate ownership tables.

---

## Repository architecture contracts and static enforcement

| Field | Value |
|---|---|
| **Capability** | Repository architecture contracts and static enforcement |
| **Owner Package** | `@asol/architecture-core` |
| **Architectural Layer** | enforcement |
| **Public Gateway** | @asol/architecture-core |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/architecture/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/architecture-core/src/**`; relative import into `packages/architecture-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/architecture-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Cross-account notification and identity bridging

| Field | Value |
|---|---|
| **Capability** | Cross-account notification and identity bridging |
| **Owner Package** | `@asol/account-bridge` |
| **Architectural Layer** | bridge |
| **Public Gateway** | `@asol/account-bridge` (., ./notifications) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/account-bridge/src/**`; relative import into `packages/account-bridge/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/account-bridge/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Authentication and session identity

| Field | Value |
|---|---|
| **Capability** | Authentication and session identity |
| **Owner Package** | `@asol/auth-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | @asol/auth-core/server |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/auth/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/auth-core/src/**`; relative import into `packages/auth-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/auth-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Backup orchestration over storage ports

| Field | Value |
|---|---|
| **Capability** | Backup orchestration over storage ports |
| **Owner Package** | `@asol/backup-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/backup-core` (., ./server) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/backup/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/backup-core/src/**`; relative import into `packages/backup-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/backup-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## App icon identity and generated branding assets

| Field | Value |
|---|---|
| **Capability** | App icon identity and generated branding assets |
| **Owner Package** | `@asol/branding-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/branding-core` (., ./tooling) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/branding/ OR src/core/composition/` |
| **Infrastructure Owner** | sharp |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/branding-core/src/**`; relative import into `packages/branding-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/branding-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Category catalog domain

| Field | Value |
|---|---|
| **Capability** | Category catalog domain |
| **Owner Package** | `@asol/catalog-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/catalog-core` (., ./server) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/catalog/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/catalog-core/src/**`; relative import into `packages/catalog-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/catalog-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Database access, sharding, and domain repositories

| Field | Value |
|---|---|
| **Capability** | Database access, sharding, and domain repositories |
| **Owner Package** | `@asol/data-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | @asol/data-core (per-domain doors + ./server paths) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/data/ OR src/core/composition/` |
| **Infrastructure Owner** | better-sqlite3, @libsql/client, drizzle-orm, drizzle-orm/better-sqlite3, drizzle-orm/libsql |
| **Final Side Effect** | Turso mutation (production) · SQLite write (local) |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/data-core/src/**`; relative import into `packages/data-core/` from outside |
| **Status** | CLOSED (enforced by architecture:check + ESLint + exports seal) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/data-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Schema health and data integrity checks

| Field | Value |
|---|---|
| **Capability** | Schema health and data integrity checks |
| **Owner Package** | `@asol/data-health-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/data-health-core` (., ./server) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/data-health/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/data-health-core/src/**`; relative import into `packages/data-health-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/data-health-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Developer-only tooling surfaces

| Field | Value |
|---|---|
| **Capability** | Developer-only tooling surfaces |
| **Owner Package** | `@asol/dev-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/dev-core` (., ./server) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/dev/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/dev-core/src/**`; relative import into `packages/dev-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/dev-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Environment variable reading rules

| Field | Value |
|---|---|
| **Capability** | Environment variable reading rules |
| **Owner Package** | `@asol/env-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/env-core` (., ./files) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/env/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/env-core/src/**`; relative import into `packages/env-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/env-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Featured marquee UI capability

| Field | Value |
|---|---|
| **Capability** | Featured marquee UI capability |
| **Owner Package** | `@asol/featured-marquee-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/featured-marquee-core` (., ./server) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/featured-marquee/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/featured-marquee-core/src/**`; relative import into `packages/featured-marquee-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/featured-marquee-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Formatting helpers with a single owner

| Field | Value |
|---|---|
| **Capability** | Formatting helpers with a single owner |
| **Owner Package** | `@asol/format-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/format-core` (.) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/format/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/format-core/src/**`; relative import into `packages/format-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/format-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Google Play store listing image assets

| Field | Value |
|---|---|
| **Capability** | Google Play store listing image assets |
| **Owner Package** | `@asol/google-play-store-assets-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/google-play-store-assets-core` (., ./images) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/google-play-store-assets/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/google-play-store-assets-core/src/**`; relative import into `packages/google-play-store-assets-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/google-play-store-assets-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Hero slider UI capability

| Field | Value |
|---|---|
| **Capability** | Hero slider UI capability |
| **Owner Package** | `@asol/hero-slider-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/hero-slider-core` (., ./server) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/hero-slider/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/hero-slider-core/src/**`; relative import into `packages/hero-slider-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/hero-slider-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## MapLibre map capability

| Field | Value |
|---|---|
| **Capability** | MapLibre map capability |
| **Owner Package** | `@asol/map-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/map-core` (.) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/map/ OR src/core/composition/` |
| **Infrastructure Owner** | maplibre-gl |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/map-core/src/**`; relative import into `packages/map-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/map-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Capacitor / native device capabilities

| Field | Value |
|---|---|
| **Capability** | Capacitor / native device capabilities |
| **Owner Package** | `@asol/native-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | @asol/native-core |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/native/ OR src/core/composition/` |
| **Infrastructure Owner** | @capacitor/cli, @capacitor/core, @capacitor/action-sheet, @capacitor/app, @capacitor/browser, @capacitor/camera, @capacitor/clipboard, @capacitor/device, @capacitor/dialog, @capacitor/filesystem, @capacitor/geolocation, @capacitor/haptics, @capacitor/keyboard, @capacitor/local-notifications, @capacitor/network, @capacitor/preferences, @capacitor/push-notifications, @capacitor/screen-orientation, @capacitor/share, @capacitor/splash-screen, @capacitor/status-bar, @capacitor/text-zoom, @capacitor/toast, @capacitor-mlkit/barcode-scanning, @capawesome/capacitor-file-picker, @capgo/capacitor-speech-recognition |
| **Final Side Effect** | Capacitor native API call |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/native-core/src/**`; relative import into `packages/native-core/` from outside |
| **Status** | CLOSED (enforced by architecture:check + ESLint + exports seal) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/native-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Push notification delivery (Web Push, FCM HTTP v1, APNs)

| Field | Value |
|---|---|
| **Capability** | Push notification delivery (Web Push, FCM HTTP v1, APNs) |
| **Owner Package** | `@asol/notifications-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | @asol/notifications-core/server |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/notifications/ OR src/core/composition/` |
| **Infrastructure Owner** | web-push, google-auth-library |
| **Final Side Effect** | Web Push / FCM HTTP v1 / APNs provider request |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/notifications-core/src/**`; relative import into `packages/notifications-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/notifications-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Observability and telemetry ports

| Field | Value |
|---|---|
| **Capability** | Observability and telemetry ports |
| **Owner Package** | `@asol/observability-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/observability-core` (., ./dev-trace, ./server) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/observability/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/observability-core/src/**`; relative import into `packages/observability-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/observability-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Order domain meaning and policies

| Field | Value |
|---|---|
| **Capability** | Order domain meaning and policies |
| **Owner Package** | `@asol/orders-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/orders-core` (.) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/orders/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/orders-core/src/**`; relative import into `packages/orders-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/orders-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## OTA publishing and update runtime

| Field | Value |
|---|---|
| **Capability** | OTA publishing and update runtime |
| **Owner Package** | `@asol/ota-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | @asol/ota-core · @asol/ota-core/publishing · @asol/ota-core/server |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/ota/ OR src/core/composition/` |
| **Infrastructure Owner** | @aws-sdk/client-s3, google-auth-library |
| **Final Side Effect** | R2 artifact upload · Google Play API |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/ota-core/src/**`; relative import into `packages/ota-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/ota-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Mandatory gateway for page-authored persistence

| Field | Value |
|---|---|
| **Capability** | Mandatory gateway for page-authored persistence |
| **Owner Package** | `@asol/page-save-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | @asol/page-save-core (single door enforced) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/page-save/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | Authoritative page mutation via registered save handlers |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/page-save-core/src/**`; relative import into `packages/page-save-core/` from outside |
| **Status** | CLOSED (enforced by architecture:check + ESLint + exports seal) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/page-save-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Page snapshot capture and restore

| Field | Value |
|---|---|
| **Capability** | Page snapshot capture and restore |
| **Owner Package** | `@asol/page-snapshot-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/page-snapshot-core` (.) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/page-snapshot/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/page-snapshot-core/src/**`; relative import into `packages/page-snapshot-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/page-snapshot-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Product domain logic

| Field | Value |
|---|---|
| **Capability** | Product domain logic |
| **Owner Package** | `@asol/product-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/product-core` (., ./server) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/product/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/product-core/src/**`; relative import into `packages/product-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/product-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Product presentation style rules

| Field | Value |
|---|---|
| **Capability** | Product presentation style rules |
| **Owner Package** | `@asol/product-style-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/product-style-core` (., ./server) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/product-style/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/product-style-core/src/**`; relative import into `packages/product-style-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/product-style-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Release console and runbooks

| Field | Value |
|---|---|
| **Capability** | Release console and runbooks |
| **Owner Package** | `@asol/release-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/release-core` (., ./console, ./console-server, ./console-artifacts, ./console/android-release-runbook) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/release/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/release-core/src/**`; relative import into `packages/release-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/release-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Secrets archive backup and restore

| Field | Value |
|---|---|
| **Capability** | Secrets archive backup and restore |
| **Owner Package** | `@asol/secrets-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/secrets-core` (.) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/secrets/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | Encrypted secrets archive filesystem write |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/secrets-core/src/**`; relative import into `packages/secrets-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/secrets-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Service source mirroring into services/*

| Field | Value |
|---|---|
| **Capability** | Service source mirroring into services/* |
| **Owner Package** | `@asol/service-mirror-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/service-mirror-core` (.) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/service-mirror/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/service-mirror-core/src/**`; relative import into `packages/service-mirror-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/service-mirror-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Shared service runtime helpers

| Field | Value |
|---|---|
| **Capability** | Shared service runtime helpers |
| **Owner Package** | `@asol/service-runtime-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/service-runtime-core` (.) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/service-runtime/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/service-runtime-core/src/**`; relative import into `packages/service-runtime-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/service-runtime-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Signed token create/verify

| Field | Value |
|---|---|
| **Capability** | Signed token create/verify |
| **Owner Package** | `@asol/signed-token-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/signed-token-core` (.) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/signed-token/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/signed-token-core/src/**`; relative import into `packages/signed-token-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/signed-token-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Object storage (R2/S3) access

| Field | Value |
|---|---|
| **Capability** | Object storage (R2/S3) access |
| **Owner Package** | `@asol/storage-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | @asol/storage-core · @asol/storage-core/server |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/storage/ OR src/core/composition/` |
| **Infrastructure Owner** | @aws-sdk/client-s3, @aws-sdk/s3-request-presigner |
| **Final Side Effect** | R2/S3 object upload/delete |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/storage-core/src/**`; relative import into `packages/storage-core/` from outside |
| **Status** | CLOSED (enforced by architecture:check + ESLint + exports seal) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/storage-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Image manager UI and client lifecycle over storage ports

| Field | Value |
|---|---|
| **Capability** | Image manager UI and client lifecycle over storage ports |
| **Owner Package** | `@asol/storage-image-manager-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/storage-image-manager-core` (., ./client-lifecycle, ./services) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/storage-image-manager/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/storage-image-manager-core/src/**`; relative import into `packages/storage-image-manager-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/storage-image-manager-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## System log capture and persistence contract

| Field | Value |
|---|---|
| **Capability** | System log capture and persistence contract |
| **Owner Package** | `@asol/system-logs-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | @asol/system-logs-core · @asol/system-logs-core/server |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/system-logs/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | System log persistence via data-core shard |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/system-logs-core/src/**`; relative import into `packages/system-logs-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/system-logs-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Trending ribbon UI capability

| Field | Value |
|---|---|
| **Capability** | Trending ribbon UI capability |
| **Owner Package** | `@asol/trending-ribbon-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/trending-ribbon-core` (., ./server) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/trending-ribbon/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | domain-specific — trace via Source Map |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/trending-ribbon-core/src/**`; relative import into `packages/trending-ribbon-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/trending-ribbon-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Vercel deployment orchestration

| Field | Value |
|---|---|
| **Capability** | Vercel deployment orchestration |
| **Owner Package** | `@asol/vercel-deploy-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/vercel-deploy-core` (.) |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/features/vercel-deploy/ OR src/core/composition/` |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Final Side Effect** | Vercel deployment API request |
| **Forbidden Bypasses** | Direct vendor SDK import outside owner; deep `@asol/vercel-deploy-core/src/**`; relative import into `packages/vercel-deploy-core/` from outside |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md) |

**Source Map:** `packages/vercel-deploy-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Composition Account Runtimes

| Capability | Owner Package | Composition Root | Allowed Consumers |
|---|---|---|---|
| Orders account runtime | `@asol/orders-composition` | `packages/orders-composition/src/index.ts` | `services/orders` deployment |
| Products account runtime | `@asol/products-composition` | `packages/products-composition/src/index.ts` | `services/products` deployment |
| Profiles account runtime | `@asol/profiles-composition` | `packages/profiles-composition/src/index.ts` | `services/profiles` deployment |
| Notifications account runtime | `@asol/notifications-composition` | `packages/notifications-composition/src/index.ts` | `services/notifications` deployment |
| Submain account runtime | `@asol/submain-composition` | `packages/submain-composition/src/index.ts` | `services/submain` deployment |
| Sub2main account runtime | `@asol/sub2main-composition` | `packages/sub2main-composition/src/index.ts` | `services/sub2main` deployment |

Main application composition roots: `src/core/composition/browser-ports.ts`, `src/core/composition/server-ports.ts`.

## Related Documents

- [Mandatory Gateways](../05-capability-enforcement/mandatory-gateways.md)
- [Capability Closure](../05-capability-enforcement/capability-closure.md)
- [Package Catalog](./package-catalog.md)

## Change Impact

Capability ownership changes require: registry update, this map, enforcement tests, composition wiring, and ADR if historical rationale changes.
