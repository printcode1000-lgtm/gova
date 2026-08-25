<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: packages/architecture-core registries (CAPABILITY_PACKAGES, APPLICATION_FEATURES).
     Regenerate: npm run architecture:docs
     Drift fails: npm run architecture:check -->

# Dependency Map

## Purpose

Explicit dependency relationships between sealed packages, derived from production imports under `packages/*/src` using the same import parser as architecture enforcement.

## Scope

Package-to-package `@asol/*` import edges. Application feature dependencies: [application-feature-catalog.md](./application-feature-catalog.md).

## Source of Truth

**Canonical sources:** live production imports under `packages/*/src` + `CAPABILITY_PACKAGES` for package identity.
This Markdown file is **generated** and verified by `architecture:check`.

---

## Global Rules

```text
capability packages
MUST NOT_IMPORT → @/ (application paths)

capability packages
MUST NOT_IMPORT → undeclared @asol/* subpaths

capability packages
MUST NOT_IMPORT → vendor SDKs not registered in vendorModules

composition packages
MAY_IMPORT → @/ (only layer with mayImportApp: true)

all packages
MUST NOT form → circular @asol/* dependency (including import type)
```

## Package Import Graph (production source)

### @asol/account-bridge

`@asol/account-bridge`
ALLOWED_TO_IMPORT → `@asol/branding-core`

`@asol/account-bridge`
ALLOWED_TO_IMPORT → `@asol/native-core`

`@asol/account-bridge`
ALLOWED_TO_IMPORT → `@asol/notifications-core`

`@asol/account-bridge`
ALLOWED_TO_IMPORT → `@asol/notifications-core/builder`

### @asol/account-declarations

`@asol/account-declarations` has no production `@asol/*` imports.

### @asol/architecture-core

`@asol/architecture-core`
ALLOWED_TO_IMPORT → `@asol/ota-core/publishing`

### @asol/auth-core

`@asol/auth-core`
ALLOWED_TO_IMPORT → `@asol/signed-token-core`

### @asol/backup-core

`@asol/backup-core`
ALLOWED_TO_IMPORT → `@asol/storage-core/server`

### @asol/branding-core

`@asol/branding-core` has no production `@asol/*` imports.

### @asol/catalog-core

`@asol/catalog-core` has no production `@asol/*` imports.

### @asol/data-core

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/auth-core`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/auth-core/server`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/backup-core`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/data-health-core`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/data-health-core/server`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/dev-core`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/dev-core/server`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/env-core/files`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/featured-marquee-core`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/hero-slider-core`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/notifications-core`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/orders-core`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/product-core`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/product-core/server`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/storage-core`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/storage-core/profiles-config`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/storage-core/server`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/system-logs-core/server`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/trending-ribbon-core`

### @asol/data-health-core

`@asol/data-health-core` has no production `@asol/*` imports.

### @asol/dev-core

`@asol/dev-core` has no production `@asol/*` imports.

### @asol/env-core

`@asol/env-core` has no production `@asol/*` imports.

### @asol/featured-marquee-core

`@asol/featured-marquee-core` has no production `@asol/*` imports.

### @asol/format-core

`@asol/format-core` has no production `@asol/*` imports.

### @asol/google-play-store-assets-core

`@asol/google-play-store-assets-core` has no production `@asol/*` imports.

### @asol/hero-slider-core

`@asol/hero-slider-core` has no production `@asol/*` imports.

### @asol/map-core

`@asol/map-core`
ALLOWED_TO_IMPORT → `@asol/native-core`

### @asol/native-core

`@asol/native-core` has no production `@asol/*` imports.

### @asol/notifications-composition

`@asol/notifications-composition`
ALLOWED_TO_IMPORT → `@asol/account-declarations/notifications`

`@asol/notifications-composition`
ALLOWED_TO_IMPORT → `@asol/data-core/notifications`

`@asol/notifications-composition`
ALLOWED_TO_IMPORT → `@asol/notifications-core/server`

### @asol/notifications-core

`@asol/notifications-core`
ALLOWED_TO_IMPORT → `@asol/branding-core`

`@asol/notifications-core`
ALLOWED_TO_IMPORT → `@asol/signed-token-core`

### @asol/observability-core

`@asol/observability-core`
ALLOWED_TO_IMPORT → `@asol/data-core/browser`

`@asol/observability-core`
ALLOWED_TO_IMPORT → `@asol/data-core/telemetry`

### @asol/orders-composition

`@asol/orders-composition`
ALLOWED_TO_IMPORT → `@asol/account-declarations/orders`

`@asol/orders-composition`
ALLOWED_TO_IMPORT → `@asol/data-core/marketplace-orders`

`@asol/orders-composition`
ALLOWED_TO_IMPORT → `@asol/orders-core`

### @asol/orders-core

`@asol/orders-core` has no production `@asol/*` imports.

### @asol/ota-core

`@asol/ota-core`
ALLOWED_TO_IMPORT → `@asol/data-core/browser`

`@asol/ota-core`
ALLOWED_TO_IMPORT → `@asol/data-core/ota`

`@asol/ota-core`
ALLOWED_TO_IMPORT → `@asol/env-core/process`

`@asol/ota-core`
ALLOWED_TO_IMPORT → `@asol/native-core`

### @asol/page-save-core

`@asol/page-save-core` has no production `@asol/*` imports.

### @asol/page-snapshot-core

`@asol/page-snapshot-core` has no production `@asol/*` imports.

### @asol/product-core

`@asol/product-core` has no production `@asol/*` imports.

### @asol/product-style-core

`@asol/product-style-core` has no production `@asol/*` imports.

### @asol/products-composition

`@asol/products-composition`
ALLOWED_TO_IMPORT → `@asol/account-declarations/products`

### @asol/profiles-composition

`@asol/profiles-composition`
ALLOWED_TO_IMPORT → `@asol/account-declarations/profiles`

### @asol/release-core

`@asol/release-core`
ALLOWED_TO_IMPORT → `@asol/env-core/process`

`@asol/release-core`
ALLOWED_TO_IMPORT → `@asol/ota-core/publishing`

`@asol/release-core`
ALLOWED_TO_IMPORT → `@asol/vercel-deploy-core`

### @asol/secrets-core

`@asol/secrets-core` has no production `@asol/*` imports.

### @asol/service-mirror-core

`@asol/service-mirror-core` has no production `@asol/*` imports.

### @asol/service-runtime-core

`@asol/service-runtime-core` has no production `@asol/*` imports.

### @asol/signed-token-core

`@asol/signed-token-core` has no production `@asol/*` imports.

### @asol/simulation-core

`@asol/simulation-core` has no production `@asol/*` imports.

### @asol/storage-core

`@asol/storage-core`
ALLOWED_TO_IMPORT → `@asol/dev-core/server`

### @asol/storage-image-manager-core

`@asol/storage-image-manager-core`
ALLOWED_TO_IMPORT → `@asol/data-core/browser`

`@asol/storage-image-manager-core`
ALLOWED_TO_IMPORT → `@asol/native-core`

`@asol/storage-image-manager-core`
ALLOWED_TO_IMPORT → `@asol/storage-core`

`@asol/storage-image-manager-core`
ALLOWED_TO_IMPORT → `@asol/system-logs-core`

### @asol/sub2main-composition

`@asol/sub2main-composition`
ALLOWED_TO_IMPORT → `@asol/account-declarations/sub2main`

### @asol/submain-composition

`@asol/submain-composition`
ALLOWED_TO_IMPORT → `@asol/account-declarations/submain`

`@asol/submain-composition`
ALLOWED_TO_IMPORT → `@asol/orders-core`

### @asol/system-logs-core

`@asol/system-logs-core` has no production `@asol/*` imports.

### @asol/trending-ribbon-core

`@asol/trending-ribbon-core` has no production `@asol/*` imports.

### @asol/vercel-deploy-core

`@asol/vercel-deploy-core`
ALLOWED_TO_IMPORT → `@asol/account-declarations`

## Counts

| Metric | Value |
|---|---|
| Packages | 42 |
| Import edges | 55 |
