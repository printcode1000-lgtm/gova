<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: packages/architecture-core registries (CAPABILITY_PACKAGES, APPLICATION_FEATURES).
     Regenerate: npm run architecture:docs
     Drift fails: npm run architecture:check -->

# Package Catalog

## Purpose

Canonical inventory of every sealed `@asol/*` package in `packages/`.

## Scope

Covers all 44 sealed packages under `packages/`. Does not cover `services/*/generated/` mirrors.

## Source of Truth

**Canonical source:** `packages/architecture-core/src/registry/capability-registry.ts` + each `packages/<folder>/package.json` `exports`.
This Markdown file is **generated** and verified by `architecture:check`.

---

### @asol/architecture-core

| Field | Value |
|---|---|
| **Package** | `@asol/architecture-core` |
| **Folder** | `packages/architecture-core/` |
| **Purpose** | Repository architecture contracts and static enforcement |
| **Architectural Layer** | enforcement |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:architecture-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/account-declarations

| Field | Value |
|---|---|
| **Package** | `@asol/account-declarations` |
| **Folder** | `packages/account-declarations/` |
| **Purpose** | Deployment account declarations and routing metadata |
| **Architectural Layer** | declarations |
| **Public Exports** | `.` · `./control` · `./gova` · `./notifications` · `./orders` · `./products` · `./profiles` · `./sub2main` · `./submain` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:account-declarations` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/account-bridge

| Field | Value |
|---|---|
| **Package** | `@asol/account-bridge` |
| **Folder** | `packages/account-bridge/` |
| **Purpose** | Cross-account notification and identity bridging |
| **Architectural Layer** | bridge |
| **Public Exports** | `.` · `./notifications` · `./routes` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:account-bridge` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/auth-core

| Field | Value |
|---|---|
| **Package** | `@asol/auth-core` |
| **Folder** | `packages/auth-core/` |
| **Purpose** | Authentication and session identity |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./phone` · `./server` · `./session` · `./super-admin` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:auth-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/backup-core

| Field | Value |
|---|---|
| **Package** | `@asol/backup-core` |
| **Folder** | `packages/backup-core/` |
| **Purpose** | Backup orchestration over storage ports |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./server` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:backup-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/branding-core

| Field | Value |
|---|---|
| **Package** | `@asol/branding-core` |
| **Folder** | `packages/branding-core/` |
| **Purpose** | App icon identity and generated branding assets |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./tooling` |
| **Infrastructure Privileges** | `sharp` |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:branding-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/catalog-core

| Field | Value |
|---|---|
| **Package** | `@asol/catalog-core` |
| **Folder** | `packages/catalog-core/` |
| **Purpose** | Category catalog domain |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./server` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:catalog-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/control-composition

| Field | Value |
|---|---|
| **Package** | `@asol/control-composition` |
| **Folder** | `packages/control-composition/` |
| **Purpose** | Composition root for the control account |
| **Architectural Layer** | composition |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | yes |
| **Test Gate** | `npm run test:compositions` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/data-core

| Field | Value |
|---|---|
| **Package** | `@asol/data-core` |
| **Folder** | `packages/data-core/` |
| **Purpose** | Database access, sharding, and domain repositories |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./account-deletion` · `./advertisements` · `./auth` · `./auth/entities` · `./browser` · `./composition` · `./control-ota` · `./control-release-state` · `./control-system-logs` · `./data-health` · `./dev-cloud-backup` · `./feature-flags` · `./follow` · `./follow/entities` · `./marketplace-orders` · `./notifications` · `./ota` · `./ota-runtime` · `./password-recovery` · `./pharmacy-profile-catalog` · `./pharmacy-profile-catalog/entities` · `./product` · `./product-search` · `./product-search-fields` · `./product-search/entities` · `./product/entities` · `./profile` · `./profile/entities` · `./provisioning` · `./runtime-config` · `./seller-discounts` · `./seller-discounts/entities` · `./super-admin` · `./system-logs` · `./telemetry` · `./tooling` |
| **Infrastructure Privileges** | `better-sqlite3`, `@libsql/client`, `drizzle-orm`, `drizzle-orm/better-sqlite3`, `drizzle-orm/libsql` |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:data-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/data-health-core

| Field | Value |
|---|---|
| **Package** | `@asol/data-health-core` |
| **Folder** | `packages/data-health-core/` |
| **Purpose** | Schema health and data integrity checks |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./server` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:data-health-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/dev-core

| Field | Value |
|---|---|
| **Package** | `@asol/dev-core` |
| **Folder** | `packages/dev-core/` |
| **Purpose** | Developer-only tooling surfaces |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./server` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:dev-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/env-core

| Field | Value |
|---|---|
| **Package** | `@asol/env-core` |
| **Folder** | `packages/env-core/` |
| **Purpose** | Environment variable reading rules |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./files` · `./process` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:env-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/featured-marquee-core

| Field | Value |
|---|---|
| **Package** | `@asol/featured-marquee-core` |
| **Folder** | `packages/featured-marquee-core/` |
| **Purpose** | Featured marquee UI capability |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./server` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:featured-marquee-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/format-core

| Field | Value |
|---|---|
| **Package** | `@asol/format-core` |
| **Folder** | `packages/format-core/` |
| **Purpose** | Formatting helpers with a single owner |
| **Architectural Layer** | capability |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:format-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/google-play-store-assets-core

| Field | Value |
|---|---|
| **Package** | `@asol/google-play-store-assets-core` |
| **Folder** | `packages/google-play-store-assets-core/` |
| **Purpose** | Google Play store listing image assets |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./images` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:google-play-store-assets-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/gova-deployment-core

| Field | Value |
|---|---|
| **Package** | `@asol/gova-deployment-core` |
| **Folder** | `packages/gova-deployment-core/` |
| **Purpose** | The gova deployment build view and its artifact gate |
| **Architectural Layer** | capability |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:gova-deployment-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/hero-slider-core

| Field | Value |
|---|---|
| **Package** | `@asol/hero-slider-core` |
| **Folder** | `packages/hero-slider-core/` |
| **Purpose** | Hero slider UI capability |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./server` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:hero-slider-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/local-agent-core

| Field | Value |
|---|---|
| **Package** | `@asol/local-agent-core` |
| **Folder** | `packages/local-agent-core/` |
| **Purpose** | local agent control plane: runner pool, coordination, memory admission, monitor, host tools and peer linking |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./direct` · `./host` · `./monitor` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:local-agent-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/map-core

| Field | Value |
|---|---|
| **Package** | `@asol/map-core` |
| **Folder** | `packages/map-core/` |
| **Purpose** | MapLibre map capability |
| **Architectural Layer** | capability |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | `maplibre-gl` |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:map-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/native-core

| Field | Value |
|---|---|
| **Package** | `@asol/native-core` |
| **Folder** | `packages/native-core/` |
| **Purpose** | Capacitor / native device capabilities |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./platform-globals` · `./scripts/android-build-preflight` · `./scripts/validate-android-r8-policy` |
| **Infrastructure Privileges** | `@capacitor/cli`, `@capacitor/core`, `@capacitor/action-sheet`, `@capacitor/app`, `@capacitor/browser`, `@capacitor/camera`, `@capacitor/clipboard`, `@capacitor/device`, `@capacitor/dialog`, `@capacitor/filesystem`, `@capacitor/geolocation`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/local-notifications`, `@capacitor/network`, `@capacitor/preferences`, `@capacitor/push-notifications`, `@capacitor/screen-orientation`, `@capacitor/share`, `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/text-zoom`, `@capacitor/toast`, `@capacitor-mlkit/barcode-scanning`, `@capawesome/capacitor-file-picker`, `@capgo/capacitor-speech-recognition` |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:native-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/notifications-core

| Field | Value |
|---|---|
| **Package** | `@asol/notifications-core` |
| **Folder** | `packages/notifications-core/` |
| **Purpose** | Push notification delivery (Web Push, FCM HTTP v1, APNs) |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./builder` · `./grant-collector` · `./grant-envelope` · `./grants` · `./providers` · `./server` |
| **Infrastructure Privileges** | `web-push`, `google-auth-library` |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:notifications-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/notifications-composition

| Field | Value |
|---|---|
| **Package** | `@asol/notifications-composition` |
| **Folder** | `packages/notifications-composition/` |
| **Purpose** | Composition root for the notifications account |
| **Architectural Layer** | composition |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | yes |
| **Test Gate** | `npm run test:notifications-composition` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/observability-core

| Field | Value |
|---|---|
| **Package** | `@asol/observability-core` |
| **Folder** | `packages/observability-core/` |
| **Purpose** | Observability and telemetry ports |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./dev-trace` · `./server` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:observability-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/orders-core

| Field | Value |
|---|---|
| **Package** | `@asol/orders-core` |
| **Folder** | `packages/orders-core/` |
| **Purpose** | Order domain meaning and policies |
| **Architectural Layer** | capability |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:orders-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/orders-composition

| Field | Value |
|---|---|
| **Package** | `@asol/orders-composition` |
| **Folder** | `packages/orders-composition/` |
| **Purpose** | Composition root for the orders account |
| **Architectural Layer** | composition |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | yes |
| **Test Gate** | `npm run test:orders-composition` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/ota-core

| Field | Value |
|---|---|
| **Package** | `@asol/ota-core` |
| **Folder** | `packages/ota-core/` |
| **Purpose** | OTA publishing and update runtime |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./admin` · `./publishing` · `./release-console` · `./server` |
| **Infrastructure Privileges** | `@aws-sdk/client-s3`, `google-auth-library` |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:ota-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/page-save-core

| Field | Value |
|---|---|
| **Package** | `@asol/page-save-core` |
| **Folder** | `packages/page-save-core/` |
| **Purpose** | Mandatory gateway for page-authored persistence |
| **Architectural Layer** | capability |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:page-save-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/page-snapshot-core

| Field | Value |
|---|---|
| **Package** | `@asol/page-snapshot-core` |
| **Folder** | `packages/page-snapshot-core/` |
| **Purpose** | Page snapshot capture and restore |
| **Architectural Layer** | capability |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:page-snapshot-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/product-core

| Field | Value |
|---|---|
| **Package** | `@asol/product-core` |
| **Folder** | `packages/product-core/` |
| **Purpose** | Product domain logic |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./server` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:product-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/product-style-core

| Field | Value |
|---|---|
| **Package** | `@asol/product-style-core` |
| **Folder** | `packages/product-style-core/` |
| **Purpose** | Product presentation style rules |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./server` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:product-style-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/products-composition

| Field | Value |
|---|---|
| **Package** | `@asol/products-composition` |
| **Folder** | `packages/products-composition/` |
| **Purpose** | Composition root for the products account |
| **Architectural Layer** | composition |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | yes |
| **Test Gate** | `npm run test:products-composition` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/profiles-composition

| Field | Value |
|---|---|
| **Package** | `@asol/profiles-composition` |
| **Folder** | `packages/profiles-composition/` |
| **Purpose** | Composition root for the profiles account |
| **Architectural Layer** | composition |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | yes |
| **Test Gate** | `npm run test:profiles-composition` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/release-core

| Field | Value |
|---|---|
| **Package** | `@asol/release-core` |
| **Folder** | `packages/release-core/` |
| **Purpose** | Release console and runbooks |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./console` · `./console-artifacts` · `./console-server` · `./console/android-release-runbook` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:release-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/secrets-core

| Field | Value |
|---|---|
| **Package** | `@asol/secrets-core` |
| **Folder** | `packages/secrets-core/` |
| **Purpose** | Secrets archive backup and restore |
| **Architectural Layer** | capability |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:secrets-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/service-mirror-core

| Field | Value |
|---|---|
| **Package** | `@asol/service-mirror-core` |
| **Folder** | `packages/service-mirror-core/` |
| **Purpose** | Service source mirroring into services/* |
| **Architectural Layer** | capability |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:service-mirror-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/service-runtime-core

| Field | Value |
|---|---|
| **Package** | `@asol/service-runtime-core` |
| **Folder** | `packages/service-runtime-core/` |
| **Purpose** | Shared service runtime helpers |
| **Architectural Layer** | capability |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:service-runtime-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/signed-token-core

| Field | Value |
|---|---|
| **Package** | `@asol/signed-token-core` |
| **Folder** | `packages/signed-token-core/` |
| **Purpose** | Signed token create/verify |
| **Architectural Layer** | capability |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:signed-token-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/storage-core

| Field | Value |
|---|---|
| **Package** | `@asol/storage-core` |
| **Folder** | `packages/storage-core/` |
| **Purpose** | Object storage (R2/S3) access |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./profiles-config` · `./server` |
| **Infrastructure Privileges** | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:storage-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/storage-image-manager-core

| Field | Value |
|---|---|
| **Package** | `@asol/storage-image-manager-core` |
| **Folder** | `packages/storage-image-manager-core/` |
| **Purpose** | Image manager UI and client lifecycle over storage ports |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./client-lifecycle` · `./services` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:storage-image-manager-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/sub2main-composition

| Field | Value |
|---|---|
| **Package** | `@asol/sub2main-composition` |
| **Folder** | `packages/sub2main-composition/` |
| **Purpose** | Composition root for the sub2main account |
| **Architectural Layer** | composition |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | yes |
| **Test Gate** | `npm run test:sub2main-composition` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/submain-composition

| Field | Value |
|---|---|
| **Package** | `@asol/submain-composition` |
| **Folder** | `packages/submain-composition/` |
| **Purpose** | Composition root for the submain account |
| **Architectural Layer** | composition |
| **Public Exports** | `.` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | yes |
| **Test Gate** | `npm run test:submain-composition` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/system-logs-core

| Field | Value |
|---|---|
| **Package** | `@asol/system-logs-core` |
| **Folder** | `packages/system-logs-core/` |
| **Purpose** | System log capture and persistence contract |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./server` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:system-logs-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/trending-ribbon-core

| Field | Value |
|---|---|
| **Package** | `@asol/trending-ribbon-core` |
| **Folder** | `packages/trending-ribbon-core/` |
| **Purpose** | Trending ribbon UI capability |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./server` |
| **Infrastructure Privileges** | none |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:trending-ribbon-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

### @asol/vercel-deploy-core

| Field | Value |
|---|---|
| **Package** | `@asol/vercel-deploy-core` |
| **Folder** | `packages/vercel-deploy-core/` |
| **Purpose** | Vercel deployment orchestration |
| **Architectural Layer** | capability |
| **Public Exports** | `.` · `./github-push-identity` · `./release-rollback` · `./release-state` · `./remote-deploy-contracts` · `./remote-deploy-sandbox` |
| **Infrastructure Privileges** | `@vercel/sandbox`, `jose` |
| **May Import App (`@/`)** | no |
| **Test Gate** | `npm run test:vercel-deploy-core` |
| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |

## Counts

| Metric | Value |
|---|---|
| Packages | 44 |
