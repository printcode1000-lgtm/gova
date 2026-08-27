# Sealed Packages & Ownership Catalog

## Package Inventory Overview

The repository manages **41 sealed packages** under `packages/`, categorized across 5 architectural layers. Every package is registered in `packages/architecture-core/src/registry/capability-registry.ts`.

---

## 1. Capability Packages (`*-core`, 33 Packages)

| Package | Ownership Statement | Owned Vendor SDKs | Key Public Doors |
|---|---|---|---|
| `@asol/auth-core` | Authentication, session tokens, password hashing, and user identity | `none` | `.`, `./tokens`, `./passwords`, `./session` |
| `@asol/backup-core` | Backup orchestration and snapshot serialization over storage ports | `none` | `.`, `./orchestrator` |
| `@asol/branding-core` | App icons, splash screens, and generated branding assets | `sharp` | `.`, `./cli` |
| `@asol/catalog-core` | Category hierarchy, catalog schema validation, and item attributes | `none` | `.`, `./schema`, `./validation` |
| `@asol/data-core` | Multi-database sharding, Turso/SQLite connections, and domain repositories | `better-sqlite3`, `@libsql/client`, `drizzle-orm`, `drizzle-orm/*` | `.`, `./database`, `./domains/*` (33 doors) |
| `@asol/data-health-core` | Schema consistency checks, orphan cleanup, and database health metrics | `none` | `.`, `./policy`, `./checker` |
| `@asol/dev-core` | Developer-only tooling surfaces, test utilities, and debug helpers | `none` | `.`, `./tools` |
| `@asol/env-core` | Validated environment variable access and redaction rules | `none` | `.`, `./schema` |
| `@asol/featured-marquee-core` | Featured marquee UI components and banner rendering | `none` | `.`, `./ui` |
| `@asol/format-core` | Currency, dates, phone numbers, and localized text formatting | `none` | `.`, `./currency`, `./phone`, `./date` |
| `@asol/google-play-store-assets-core` | Google Play listing assets, store graphics, and metadata | `none` | `.`, `./assets` |
| `@asol/hero-slider-core` | Hero slider UI components, slide animations, and auto-play logic | `none` | `.`, `./ui` |
| `@asol/map-core` | MapLibre GL map rendering, marker clustering, and location pinning | `maplibre-gl` | `.`, `./ui`, `./clustering` |
| `@asol/native-core` | Capacitor bridge, native device capabilities, plugins, and OS policies | `@capacitor/*`, `@capawesome/*`, `@capgo/*` | `.`, `./adapters/*`, `./capabilities` |
| `@asol/notifications-core` | Push notification delivery (Web Push, FCM HTTP v1, APNs) | `web-push`, `google-auth-library` | `.`, `./delivery`, `./providers/*` |
| `@asol/observability-core` | Observability metrics, error reporting, and telemetry ports | `none` | `.`, `./telemetry`, `./ports` |
| `@asol/orders-core` | Order state machines, multi-seller splitting, and order policies | `none` | `.`, `./state`, `./pricing` |
| `@asol/ota-core` | Over-The-Air update publishing, bundle signing, and client download engine | `@aws-sdk/client-s3`, `google-auth-library` | `.`, `./client`, `./server`, `./manifest` |
| `@asol/page-save-core` | Mandatory single-door gateway for page-authored persistence | `none` | `.` (Single Door Only) |
| `@asol/page-snapshot-core` | Top-level page state snapshotting and restoration | `none` | `.`, `./snapshot` |
| `@asol/product-core` | Product domain validation, item metadata, and pricing engines | `none` | `.`, `./pricing`, `./validation` |
| `@asol/product-style-core` | Product presentation style rules, theme variants, and layout cards | `none` | `.`, `./styles` |
| `@asol/release-core` | Release console orchestrator, deploy runbooks, and build checks | `none` | `.`, `./runbook`, `./versioning` |
| `@asol/secrets-core` | Secrets archive backup, AES-GCM encryption, and restore tooling | `none` | `.`, `./crypto`, `./archive` |
| `@asol/service-mirror-core` | Source code mirroring and synchronization into `services/*` | `none` | `.`, `./sync` |
| `@asol/service-runtime-core` | Shared microservice runtime bootstrap and request context helpers | `none` | `.`, `./bootstrap`, `./context` |
| `@asol/signed-token-core` | HMAC-SHA256 token creation, verification, and grant validation | `none` | `.`, `./crypto` |
| `@asol/simulation-core` | Real-user page interaction simulation and automated coverage discovery | `none` | `.`, `./engine`, `./discovery` |
| `@asol/storage-core` | Cloudflare R2 / AWS S3 client and storage profile abstractions | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | `.`, `./r2`, `./profiles` |
| `@asol/storage-image-manager-core` | Image compression, client upload queues, and image manager UI | `none` | `.`, `./queue`, `./ui` |
| `@asol/system-logs-core` | System audit log collection, schema, and persistence contracts | `none` | `.`, `./collector`, `./types` |
| `@asol/trending-ribbon-core` | Trending ribbon UI component and badge rendering | `none` | `.`, `./ui` |
| `@asol/ui-registry-core` | UiRegistry DOM diagnostic attribute builders and simulation contracts | `none` | `.`, `./registry`, `./attributes` |
| `@asol/vercel-deploy-core` | Vercel deployment orchestration, API tokens, and project management | `@vercel/sandbox` | `.`, `./deployer` |

---

## 2. Composition Packages (`*-composition`, 6 Packages)

Composition packages are the **only packages** permitted to import application code (`mayImportApp: true`). They wire application features, repositories, and domain services to specific deployment modules:

1. `@asol/notifications-composition`: Composition root for `services/notifications` (binds delivery ports to FCM/APNs).
2. `@asol/orders-composition`: Composition root for `services/orders` (binds order querying and shard routing).
3. `@asol/products-composition`: Composition root for `services/products` (binds catalog read operations).
4. `@asol/profiles-composition`: Composition root for `services/profiles` (binds merchant profile read operations).
5. `@asol/submain-composition`: Composition root for `asol-submain` auxiliary deployment target.
6. `@asol/sub2main-composition`: Composition root for `asol-sub2main` secondary auxiliary deployment target.

---

## 3. Declarations Package (`account-declarations`, 1 Package)

- **`@asol/account-declarations`**:
  - Contains pure configuration and typed declarations for all 7 deployment accounts and Turso database shards.
  - **Zero runtime dependencies**: Imports nothing and executes no code.
  - Composition packages import account-specific doors (e.g. `@asol/account-declarations/notifications`) to prevent environment leakage.

---

## 4. Bridge Package (`account-bridge`, 1 Package)

- **`@asol/account-bridge`**:
  - Client-side runtime for multi-account identity, cross-account notification grant transport, and device push token registration across accounts.
  - Runs in the browser and mobile native shells.

---

## 5. Enforcement Package (`architecture-core`, 1 Package)

- **`@asol/architecture-core`**:
  - Implements static AST scanners using TypeScript compiler APIs.
  - Contains canonical registries (`CAPABILITY_PACKAGES`, `APPLICATION_FEATURES`, `ROOT_VENDOR_OWNED_FILES`).
  - Powers `npm run architecture:check` and `npm run architecture:docs`.
