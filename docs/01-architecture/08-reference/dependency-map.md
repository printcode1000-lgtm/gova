# Dependency Map

## Purpose

Explicit dependency relationships between sealed packages, verified by scanning production imports under `packages/*/src`.

## Scope

Package-to-package `@asol/*` import edges. Application-layer imports are governed by [Application Layers](../10-application-layers/README.md) and ESLint layer rules.

## Source of Truth

This document is the canonical inter-package dependency reference. Allowed/forbidden rules are defined in [dependency-rules.md](../03-dependencies/dependency-rules.md).

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
ALLOWED_TO_IMPORT → `@asol`

`@asol/account-bridge`
ALLOWED_TO_IMPORT → `@asol/notifications-core`

### @asol/architecture-core

`@asol/architecture-core`
ALLOWED_TO_IMPORT → `@asol/ota-core/publishing`

### @asol/auth-core

`@asol/auth-core`
ALLOWED_TO_IMPORT → `@asol`

### @asol/backup-core

`@asol/backup-core`
ALLOWED_TO_IMPORT → `@asol/storage-core/server`

### @asol/data-core

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/auth-core/server`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/data-health-core/server`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/dev-core/server`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/env-core`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/product-core/server`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/storage-core`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/storage-core/server`

`@asol/data-core`
ALLOWED_TO_IMPORT → `@asol/system-logs-core/server`

### @asol/map-core

`@asol/map-core`
ALLOWED_TO_IMPORT → `@asol`

### @asol/notifications-composition

`@asol/notifications-composition`
ALLOWED_TO_IMPORT → `@asol/account-declarations`

`@asol/notifications-composition`
ALLOWED_TO_IMPORT → `@asol/data-core`

`@asol/notifications-composition`
ALLOWED_TO_IMPORT → `@asol/notifications-core/server`

### @asol/notifications-core

`@asol/notifications-core`
ALLOWED_TO_IMPORT → `@asol`

### @asol/observability-core

`@asol/observability-core`
ALLOWED_TO_IMPORT → `@asol/data-core`

`@asol/observability-core`
ALLOWED_TO_IMPORT → `@asol/data-core/browser`

### @asol/orders-composition

`@asol/orders-composition`
ALLOWED_TO_IMPORT → `@asol`

`@asol/orders-composition`
ALLOWED_TO_IMPORT → `@asol/account-declarations`

`@asol/orders-composition`
ALLOWED_TO_IMPORT → `@asol/data-core`

### @asol/ota-core

`@asol/ota-core`
ALLOWED_TO_IMPORT → `@asol`

`@asol/ota-core`
ALLOWED_TO_IMPORT → `@asol/data-core`

`@asol/ota-core`
ALLOWED_TO_IMPORT → `@asol/data-core/browser`

### @asol/products-composition

`@asol/products-composition`
ALLOWED_TO_IMPORT → `@asol/account-declarations`

### @asol/profiles-composition

`@asol/profiles-composition`
ALLOWED_TO_IMPORT → `@asol/account-declarations`

### @asol/release-core

`@asol/release-core`
ALLOWED_TO_IMPORT → `@asol`

`@asol/release-core`
ALLOWED_TO_IMPORT → `@asol/ota-core/publishing`

### @asol/storage-core

`@asol/storage-core`
ALLOWED_TO_IMPORT → `@asol/dev-core/server`

### @asol/storage-image-manager-core

`@asol/storage-image-manager-core`
ALLOWED_TO_IMPORT → `@asol`

`@asol/storage-image-manager-core`
ALLOWED_TO_IMPORT → `@asol/data-core/browser`

### @asol/sub2main-composition

`@asol/sub2main-composition`
ALLOWED_TO_IMPORT → `@asol/account-declarations`

### @asol/submain-composition

`@asol/submain-composition`
ALLOWED_TO_IMPORT → `@asol`

`@asol/submain-composition`
ALLOWED_TO_IMPORT → `@asol/account-declarations`

### @asol/vercel-deploy-core

`@asol/vercel-deploy-core`
ALLOWED_TO_IMPORT → `@asol`

## Forbidden Patterns (enforced)

```text
any consumer
MUST_NOT_IMPORT → @asol/*/src/**

any consumer outside packages/<owner>/
MUST_NOT_IMPORT → **/packages/<other>/** (relative path into packages/)

src/** and scripts/**
MUST_NOT_IMPORT → better-sqlite3, @libsql/client, drizzle-orm (except via @asol/data-core doors)

packages except native-core
MUST_NOT_IMPORT → @capacitor/*

packages except storage-core, ota-core, notifications-core
MUST_NOT_IMPORT → @aws-sdk/*, google-auth-library
```

## Related Documents

- [Allowed Dependencies](../03-dependencies/allowed-dependencies.md)
- [Forbidden Dependencies](../03-dependencies/forbidden-dependencies.md)
- [Package Catalog](./package-catalog.md)

## Change Impact

New inter-package imports require: cycle check (`checkPackageCycleContract`), registry alignment, and update to this map.
