<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: packages/architecture-core registries (CAPABILITY_PACKAGES, APPLICATION_FEATURES).
     Regenerate: npm run architecture:docs
     Drift fails: npm run architecture:check -->

# Capability Map

## Purpose

Machine-readable capability ownership reference. Each capability has exactly one authoritative owner package. Agents MUST consult this map before modifying or introducing capabilities.

## Scope

All 43 sealed `@asol/*` packages. Application-layer orchestration lives under `src/features/*` — see [application-feature-catalog.md](./application-feature-catalog.md).

## Source of Truth

**Canonical source:** `packages/architecture-core/src/registry/capability-registry.ts` (`CAPABILITY_PACKAGES`).
This Markdown file is **generated** and verified by `architecture:check`. Do not edit it by hand.

---

## Repository architecture contracts and static enforcement

| Field | Value |
|---|---|
| **Capability** | Repository architecture contracts and static enforcement |
| **Owner Package** | `@asol/architecture-core` |
| **Architectural Layer** | enforcement |
| **Public Gateway** | `@asol/architecture-core` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/architecture-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Deployment account declarations and routing metadata

| Field | Value |
|---|---|
| **Capability** | Deployment account declarations and routing metadata |
| **Owner Package** | `@asol/account-declarations` |
| **Architectural Layer** | declarations |
| **Public Gateway** | `@asol/account-declarations` · `@asol/account-declarations/control` · `@asol/account-declarations/gova` · `@asol/account-declarations/notifications` · `@asol/account-declarations/orders` · `@asol/account-declarations/products` · `@asol/account-declarations/profiles` · `@asol/account-declarations/sub2main` · `@asol/account-declarations/submain` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/account-declarations/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Cross-account notification and identity bridging

| Field | Value |
|---|---|
| **Capability** | Cross-account notification and identity bridging |
| **Owner Package** | `@asol/account-bridge` |
| **Architectural Layer** | bridge |
| **Public Gateway** | `@asol/account-bridge` · `@asol/account-bridge/notifications` · `@asol/account-bridge/routes` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/account-bridge/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Authentication and session identity

| Field | Value |
|---|---|
| **Capability** | Authentication and session identity |
| **Owner Package** | `@asol/auth-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/auth-core` · `@asol/auth-core/phone` · `@asol/auth-core/server` · `@asol/auth-core/session` · `@asol/auth-core/super-admin` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/auth-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Backup orchestration over storage ports

| Field | Value |
|---|---|
| **Capability** | Backup orchestration over storage ports |
| **Owner Package** | `@asol/backup-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/backup-core` · `@asol/backup-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/backup-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## App icon identity and generated branding assets

| Field | Value |
|---|---|
| **Capability** | App icon identity and generated branding assets |
| **Owner Package** | `@asol/branding-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/branding-core` · `@asol/branding-core/tooling` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | `sharp` |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/branding-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Category catalog domain

| Field | Value |
|---|---|
| **Capability** | Category catalog domain |
| **Owner Package** | `@asol/catalog-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/catalog-core` · `@asol/catalog-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/catalog-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Composition root for the control account

| Field | Value |
|---|---|
| **Capability** | Composition root for the control account |
| **Owner Package** | `@asol/control-composition` |
| **Architectural Layer** | composition |
| **Public Gateway** | `@asol/control-composition` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/core/composition/` + feature ports |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/control-composition/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Database access, sharding, and domain repositories

| Field | Value |
|---|---|
| **Capability** | Database access, sharding, and domain repositories |
| **Owner Package** | `@asol/data-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/data-core` · `@asol/data-core/account-deletion` · `@asol/data-core/advertisements` · `@asol/data-core/auth` · `@asol/data-core/auth/entities` · `@asol/data-core/browser` · `@asol/data-core/composition` · `@asol/data-core/control-ota` · `@asol/data-core/control-release-state` · `@asol/data-core/control-system-logs` · `@asol/data-core/data-health` · `@asol/data-core/dev-cloud-backup` · `@asol/data-core/feature-flags` · `@asol/data-core/follow` · `@asol/data-core/follow/entities` · `@asol/data-core/marketplace-orders` · `@asol/data-core/notifications` · `@asol/data-core/ota` · `@asol/data-core/ota-runtime` · `@asol/data-core/password-recovery` · `@asol/data-core/pharmacy-profile-catalog` · `@asol/data-core/pharmacy-profile-catalog/entities` · `@asol/data-core/product` · `@asol/data-core/product-search` · `@asol/data-core/product-search-fields` · `@asol/data-core/product-search/entities` · `@asol/data-core/product/entities` · `@asol/data-core/profile` · `@asol/data-core/profile/entities` · `@asol/data-core/provisioning` · `@asol/data-core/runtime-config` · `@asol/data-core/seller-discounts` · `@asol/data-core/seller-discounts/entities` · `@asol/data-core/super-admin` · `@asol/data-core/system-logs` · `@asol/data-core/telemetry` · `@asol/data-core/tooling` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | `better-sqlite3`, `@libsql/client`, `drizzle-orm`, `drizzle-orm/better-sqlite3`, `drizzle-orm/libsql` |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/data-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Schema health and data integrity checks

| Field | Value |
|---|---|
| **Capability** | Schema health and data integrity checks |
| **Owner Package** | `@asol/data-health-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/data-health-core` · `@asol/data-health-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/data-health-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Developer-only tooling surfaces

| Field | Value |
|---|---|
| **Capability** | Developer-only tooling surfaces |
| **Owner Package** | `@asol/dev-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/dev-core` · `@asol/dev-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/dev-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Environment variable reading rules

| Field | Value |
|---|---|
| **Capability** | Environment variable reading rules |
| **Owner Package** | `@asol/env-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/env-core` · `@asol/env-core/files` · `@asol/env-core/process` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/env-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Featured marquee UI capability

| Field | Value |
|---|---|
| **Capability** | Featured marquee UI capability |
| **Owner Package** | `@asol/featured-marquee-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/featured-marquee-core` · `@asol/featured-marquee-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/featured-marquee-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Formatting helpers with a single owner

| Field | Value |
|---|---|
| **Capability** | Formatting helpers with a single owner |
| **Owner Package** | `@asol/format-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/format-core` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/format-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Google Play store listing image assets

| Field | Value |
|---|---|
| **Capability** | Google Play store listing image assets |
| **Owner Package** | `@asol/google-play-store-assets-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/google-play-store-assets-core` · `@asol/google-play-store-assets-core/images` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/google-play-store-assets-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## The gova deployment build view and its artifact gate

| Field | Value |
|---|---|
| **Capability** | The gova deployment build view and its artifact gate |
| **Owner Package** | `@asol/gova-deployment-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/gova-deployment-core` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/gova-deployment-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Hero slider UI capability

| Field | Value |
|---|---|
| **Capability** | Hero slider UI capability |
| **Owner Package** | `@asol/hero-slider-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/hero-slider-core` · `@asol/hero-slider-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/hero-slider-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## MapLibre map capability

| Field | Value |
|---|---|
| **Capability** | MapLibre map capability |
| **Owner Package** | `@asol/map-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/map-core` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | `maplibre-gl` |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/map-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Capacitor / native device capabilities

| Field | Value |
|---|---|
| **Capability** | Capacitor / native device capabilities |
| **Owner Package** | `@asol/native-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/native-core` · `@asol/native-core/capability-keys` · `@asol/native-core/platform-globals` · `@asol/native-core/scripts/android-build-preflight` · `@asol/native-core/scripts/validate-android-r8-policy` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | `@capacitor/cli`, `@capacitor/core`, `@capacitor/action-sheet`, `@capacitor/app`, `@capacitor/browser`, `@capacitor/camera`, `@capacitor/clipboard`, `@capacitor/device`, `@capacitor/dialog`, `@capacitor/filesystem`, `@capacitor/geolocation`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/local-notifications`, `@capacitor/network`, `@capacitor/preferences`, `@capacitor/push-notifications`, `@capacitor/screen-orientation`, `@capacitor/share`, `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/text-zoom`, `@capacitor/toast`, `@capacitor-mlkit/barcode-scanning`, `@capawesome/capacitor-file-picker`, `@capgo/capacitor-speech-recognition` |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/native-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Push notification delivery (Web Push, FCM HTTP v1, APNs)

| Field | Value |
|---|---|
| **Capability** | Push notification delivery (Web Push, FCM HTTP v1, APNs) |
| **Owner Package** | `@asol/notifications-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/notifications-core` · `@asol/notifications-core/builder` · `@asol/notifications-core/grant-collector` · `@asol/notifications-core/grant-envelope` · `@asol/notifications-core/grants` · `@asol/notifications-core/providers` · `@asol/notifications-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | `web-push`, `google-auth-library` |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/notifications-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Composition root for the notifications account

| Field | Value |
|---|---|
| **Capability** | Composition root for the notifications account |
| **Owner Package** | `@asol/notifications-composition` |
| **Architectural Layer** | composition |
| **Public Gateway** | `@asol/notifications-composition` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/core/composition/` + feature ports |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/notifications-composition/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Observability and telemetry ports

| Field | Value |
|---|---|
| **Capability** | Observability and telemetry ports |
| **Owner Package** | `@asol/observability-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/observability-core` · `@asol/observability-core/dev-trace` · `@asol/observability-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/observability-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Order domain meaning and policies

| Field | Value |
|---|---|
| **Capability** | Order domain meaning and policies |
| **Owner Package** | `@asol/orders-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/orders-core` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/orders-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Composition root for the orders account

| Field | Value |
|---|---|
| **Capability** | Composition root for the orders account |
| **Owner Package** | `@asol/orders-composition` |
| **Architectural Layer** | composition |
| **Public Gateway** | `@asol/orders-composition` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/core/composition/` + feature ports |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/orders-composition/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## OTA publishing and update runtime

| Field | Value |
|---|---|
| **Capability** | OTA publishing and update runtime |
| **Owner Package** | `@asol/ota-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/ota-core` · `@asol/ota-core/admin` · `@asol/ota-core/ports` · `@asol/ota-core/publishing` · `@asol/ota-core/release-console` · `@asol/ota-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | `@aws-sdk/client-s3`, `google-auth-library` |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/ota-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Mandatory gateway for page-authored persistence

| Field | Value |
|---|---|
| **Capability** | Mandatory gateway for page-authored persistence |
| **Owner Package** | `@asol/page-save-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/page-save-core` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/page-save-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Page snapshot capture and restore

| Field | Value |
|---|---|
| **Capability** | Page snapshot capture and restore |
| **Owner Package** | `@asol/page-snapshot-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/page-snapshot-core` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/page-snapshot-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Product domain logic

| Field | Value |
|---|---|
| **Capability** | Product domain logic |
| **Owner Package** | `@asol/product-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/product-core` · `@asol/product-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/product-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Product presentation style rules

| Field | Value |
|---|---|
| **Capability** | Product presentation style rules |
| **Owner Package** | `@asol/product-style-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/product-style-core` · `@asol/product-style-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/product-style-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Composition root for the products account

| Field | Value |
|---|---|
| **Capability** | Composition root for the products account |
| **Owner Package** | `@asol/products-composition` |
| **Architectural Layer** | composition |
| **Public Gateway** | `@asol/products-composition` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/core/composition/` + feature ports |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/products-composition/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Composition root for the profiles account

| Field | Value |
|---|---|
| **Capability** | Composition root for the profiles account |
| **Owner Package** | `@asol/profiles-composition` |
| **Architectural Layer** | composition |
| **Public Gateway** | `@asol/profiles-composition` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/core/composition/` + feature ports |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/profiles-composition/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Release console and runbooks

| Field | Value |
|---|---|
| **Capability** | Release console and runbooks |
| **Owner Package** | `@asol/release-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/release-core` · `@asol/release-core/console` · `@asol/release-core/console-artifacts` · `@asol/release-core/console-server` · `@asol/release-core/console/android-release-runbook` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/release-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Secrets archive backup and restore

| Field | Value |
|---|---|
| **Capability** | Secrets archive backup and restore |
| **Owner Package** | `@asol/secrets-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/secrets-core` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/secrets-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Service source mirroring into services/*

| Field | Value |
|---|---|
| **Capability** | Service source mirroring into services/* |
| **Owner Package** | `@asol/service-mirror-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/service-mirror-core` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/service-mirror-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Shared service runtime helpers

| Field | Value |
|---|---|
| **Capability** | Shared service runtime helpers |
| **Owner Package** | `@asol/service-runtime-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/service-runtime-core` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/service-runtime-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Signed token create/verify

| Field | Value |
|---|---|
| **Capability** | Signed token create/verify |
| **Owner Package** | `@asol/signed-token-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/signed-token-core` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/signed-token-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Object storage (R2/S3) access

| Field | Value |
|---|---|
| **Capability** | Object storage (R2/S3) access |
| **Owner Package** | `@asol/storage-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/storage-core` · `@asol/storage-core/profiles-config` · `@asol/storage-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/storage-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Image manager UI and client lifecycle over storage ports

| Field | Value |
|---|---|
| **Capability** | Image manager UI and client lifecycle over storage ports |
| **Owner Package** | `@asol/storage-image-manager-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/storage-image-manager-core` · `@asol/storage-image-manager-core/client-lifecycle` · `@asol/storage-image-manager-core/services` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/storage-image-manager-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Composition root for the sub2main account

| Field | Value |
|---|---|
| **Capability** | Composition root for the sub2main account |
| **Owner Package** | `@asol/sub2main-composition` |
| **Architectural Layer** | composition |
| **Public Gateway** | `@asol/sub2main-composition` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/core/composition/` + feature ports |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/sub2main-composition/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Composition root for the submain account

| Field | Value |
|---|---|
| **Capability** | Composition root for the submain account |
| **Owner Package** | `@asol/submain-composition` |
| **Architectural Layer** | composition |
| **Public Gateway** | `@asol/submain-composition` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `src/core/composition/` + feature ports |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/submain-composition/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## System log capture and persistence contract

| Field | Value |
|---|---|
| **Capability** | System log capture and persistence contract |
| **Owner Package** | `@asol/system-logs-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/system-logs-core` · `@asol/system-logs-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/system-logs-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Trending ribbon UI capability

| Field | Value |
|---|---|
| **Capability** | Trending ribbon UI capability |
| **Owner Package** | `@asol/trending-ribbon-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/trending-ribbon-core` · `@asol/trending-ribbon-core/server` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | none (pure logic or ports) |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/trending-ribbon-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Vercel deployment orchestration

| Field | Value |
|---|---|
| **Capability** | Vercel deployment orchestration |
| **Owner Package** | `@asol/vercel-deploy-core` |
| **Architectural Layer** | capability |
| **Public Gateway** | `@asol/vercel-deploy-core` · `@asol/vercel-deploy-core/github-push-identity` · `@asol/vercel-deploy-core/project-env` · `@asol/vercel-deploy-core/release-rollback` · `@asol/vercel-deploy-core/release-state` · `@asol/vercel-deploy-core/remote-deploy-contracts` · `@asol/vercel-deploy-core/remote-deploy-sandbox` |
| **Allowed Consumers** | Application via declared doors; composition packages wire ports |
| **Composition Root** | `N/A` (capability must not import `@/`) |
| **Infrastructure Owner** | `@vercel/sandbox`, `jose` |
| **Status** | CLOSED (sealed package with registry entry) |
| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

**Source Map:** `packages/vercel-deploy-core/` · registry: `packages/architecture-core/src/registry/capability-registry.ts`

---

## Counts

| Metric | Value |
|---|---|
| Sealed packages | 43 |
| Layer `bridge` | 1 |
| Layer `capability` | 33 |
| Layer `composition` | 7 |
| Layer `declarations` | 1 |
| Layer `enforcement` | 1 |
