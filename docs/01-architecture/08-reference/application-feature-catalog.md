<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: packages/architecture-core registries (CAPABILITY_PACKAGES, APPLICATION_FEATURES).
     Regenerate: npm run architecture:docs
     Drift fails: npm run architecture:check -->

# Application Feature Catalog

## Purpose

Canonical inventory of every application feature under `src/features/`.

## Scope

All 48 registered features. Sealed packages are listed in [package-catalog.md](./package-catalog.md).

## Source of Truth

**Canonical source:** `packages/architecture-core/src/registry/application-features-registry.ts` (`APPLICATION_FEATURES`).
This Markdown file is **generated** and verified by `architecture:check`.

## Approved application roots

```text
src/
  app/        # Next.js routes (framework-required)
  core/       # API client, config, composition roots, providers
  features/   # Application features (registered, default-deny)
  shared/     # Cross-feature, domain-neutral application code only
```

`src/modules/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/theme/`, and `src/locales/` are forbidden competing roots.

---

### account-bridge

| Field | Value |
|---|---|
| **Feature** | `account-bridge` |
| **Source** | `src/features/account-bridge/` |
| **Owns** | Application wiring for cross-account notification identity bridging |
| **Public Doors** | `@/features/account-bridge` |
| **Runtime Targets** | `web` |
| **Capability Owners** | `@asol/account-bridge` |
| **Permitted Feature Dependencies** | `notifications` |
| **Surfaces** | browser=false · server=false · ui=false |

### advertisements

| Field | Value |
|---|---|
| **Feature** | `advertisements` |
| **Source** | `src/features/advertisements/` |
| **Owns** | Home advertisements surfaces (hero slider, featured marquee, trending ribbon) |
| **Public Doors** | `@/features/advertisements` · `@/features/advertisements/ui` · `@/features/advertisements/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/hero-slider-core`, `@asol/featured-marquee-core`, `@asol/trending-ribbon-core`, `@asol/auth-core` |
| **Permitted Feature Dependencies** | `product`, `product-card`, `storage` |
| **Surfaces** | browser=true · server=true · ui=true |

### app-reset

| Field | Value |
|---|---|
| **Feature** | `app-reset` |
| **Source** | `src/features/app-reset/` |
| **Owns** | Client application reset orchestration |
| **Public Doors** | `@/features/app-reset` |
| **Runtime Targets** | `web` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `notifications` |
| **Surfaces** | browser=false · server=false · ui=false |

### auth

| Field | Value |
|---|---|
| **Feature** | `auth` |
| **Source** | `src/features/auth/` |
| **Owns** | Authentication, session, registration, and account deletion UI/services |
| **Public Doors** | `@/features/auth` · `@/features/auth/ui` · `@/features/auth/server` · `@/features/auth/session` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/auth-core`, `@asol/data-core` |
| **Permitted Feature Dependencies** | `app-reset`, `notifications`, `page-save`, `storage`, `system-logs` |
| **Surfaces** | browser=true · server=true · ui=true |

### cart

| Field | Value |
|---|---|
| **Feature** | `cart` |
| **Source** | `src/features/cart/` |
| **Owns** | Shopping cart client and server orchestration |
| **Public Doors** | `@/features/cart` · `@/features/cart/ui` · `@/features/cart/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/product-core` |
| **Permitted Feature Dependencies** | `notifications`, `seller-discounts` |
| **Surfaces** | browser=true · server=true · ui=true |

### catalog-studio

| Field | Value |
|---|---|
| **Feature** | `catalog-studio` |
| **Source** | `src/features/catalog-studio/` |
| **Owns** | Developer catalog studio editing surfaces |
| **Public Doors** | `@/features/catalog-studio` · `@/features/catalog-studio/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/catalog-core` |
| **Permitted Feature Dependencies** | `auth`, `page-save` |
| **Surfaces** | browser=true · server=true · ui=true |

### categories

| Field | Value |
|---|---|
| **Feature** | `categories` |
| **Source** | `src/features/categories/` |
| **Owns** | Category browsing and seller discovery presentation |
| **Public Doors** | `@/features/categories` · `@/features/categories/ui` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/catalog-core` |
| **Permitted Feature Dependencies** | `profile`, `seller-card` |
| **Surfaces** | browser=true · server=true · ui=true |

### contact

| Field | Value |
|---|---|
| **Feature** | `contact` |
| **Source** | `src/features/contact/` |
| **Owns** | Contact actions and seller contact orchestration |
| **Public Doors** | `@/features/contact` · `@/features/contact/ui` · `@/features/contact/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | _(none)_ |
| **Surfaces** | browser=true · server=true · ui=true |

### data

| Field | Value |
|---|---|
| **Feature** | `data` |
| **Source** | `src/features/data/` |
| **Owns** | Data-core application port wiring |
| **Public Doors** | `@/features/data` · `@/features/data/server` |
| **Runtime Targets** | `web` |
| **Capability Owners** | `@asol/data-core` |
| **Permitted Feature Dependencies** | `categories`, `product-search` |
| **Surfaces** | browser=false · server=false · ui=false |

### data-health

| Field | Value |
|---|---|
| **Feature** | `data-health` |
| **Source** | `src/features/data-health/` |
| **Owns** | Development data-health inspection and cleanup UI |
| **Public Doors** | `@/features/data-health` · `@/features/data-health/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/data-health-core`, `@asol/data-core` |
| **Permitted Feature Dependencies** | `auth`, `page-save`, `system-logs` |
| **Surfaces** | browser=true · server=true · ui=true |

### dev-cloud-backup

| Field | Value |
|---|---|
| **Feature** | `dev-cloud-backup` |
| **Source** | `src/features/dev-cloud-backup/` |
| **Owns** | Development Turso cloud backup console |
| **Public Doors** | `@/features/dev-cloud-backup` · `@/features/dev-cloud-backup/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/backup-core`, `@asol/data-core` |
| **Permitted Feature Dependencies** | `auth`, `page-save` |
| **Surfaces** | browser=true · server=true · ui=true |

### dev-tools

| Field | Value |
|---|---|
| **Feature** | `dev-tools` |
| **Source** | `src/features/dev-tools/` |
| **Owns** | Developer-only tooling pages |
| **Public Doors** | `@/features/dev-tools` · `@/features/dev-tools/ui` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | `@asol/dev-core` |
| **Permitted Feature Dependencies** | `categories`, `page-save`, `pharmacy-profile-catalog`, `product` |
| **Surfaces** | browser=true · server=false · ui=true |

### favorites

| Field | Value |
|---|---|
| **Feature** | `favorites` |
| **Source** | `src/features/favorites/` |
| **Owns** | Favorites list and adapters |
| **Public Doors** | `@/features/favorites` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `auth`, `follow`, `product-card`, `seller-card`, `system-logs` |
| **Surfaces** | browser=true · server=false · ui=true |

### feature-flags

| Field | Value |
|---|---|
| **Feature** | `feature-flags` |
| **Source** | `src/features/feature-flags/` |
| **Owns** | Feature flag evaluation wiring |
| **Public Doors** | `@/features/feature-flags` · `@/features/feature-flags/server` |
| **Runtime Targets** | `web`, `server` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `auth` |
| **Surfaces** | browser=false · server=true · ui=false |

### follow

| Field | Value |
|---|---|
| **Feature** | `follow` |
| **Source** | `src/features/follow/` |
| **Owns** | Follow/unfollow seller relationships |
| **Public Doors** | `@/features/follow` · `@/features/follow/ui` · `@/features/follow/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `auth`, `notifications` |
| **Surfaces** | browser=true · server=true · ui=true |

### google-play-console

| Field | Value |
|---|---|
| **Feature** | `google-play-console` |
| **Source** | `src/features/google-play-console/` |
| **Owns** | Release console, deploy runbook, and Play Store assets UI |
| **Public Doors** | `@/features/google-play-console` · `@/features/google-play-console/ui` · `@/features/google-play-console/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/google-play-store-assets-core`, `@asol/release-core`, `@asol/ota-core` |
| **Permitted Feature Dependencies** | `auth`, `page-save`, `release-commands` |
| **Surfaces** | browser=true · server=true · ui=true |

### home

| Field | Value |
|---|---|
| **Feature** | `home` |
| **Source** | `src/features/home/` |
| **Owns** | Home screen composition |
| **Public Doors** | `@/features/home` · `@/features/home/ui` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `advertisements`, `categories` |
| **Surfaces** | browser=true · server=false · ui=true |

### location

| Field | Value |
|---|---|
| **Feature** | `location` |
| **Source** | `src/features/location/` |
| **Owns** | Location capture and map-related application surfaces |
| **Public Doors** | `@/features/location` |
| **Runtime Targets** | `web` |
| **Capability Owners** | `@asol/map-core` |
| **Permitted Feature Dependencies** | _(none)_ |
| **Surfaces** | browser=false · server=false · ui=false |

### navigation

| Field | Value |
|---|---|
| **Feature** | `navigation` |
| **Source** | `src/features/navigation/` |
| **Owns** | In-app navigation helpers |
| **Public Doors** | `@/features/navigation` · `@/features/navigation/ui` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | _(none)_ |
| **Surfaces** | browser=true · server=false · ui=true |

### network

| Field | Value |
|---|---|
| **Feature** | `network` |
| **Source** | `src/features/network/` |
| **Owns** | Network status UI and hooks |
| **Public Doors** | `@/features/network` · `@/features/network/ui` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `system-logs` |
| **Surfaces** | browser=true · server=false · ui=true |

### notifications

| Field | Value |
|---|---|
| **Feature** | `notifications` |
| **Source** | `src/features/notifications/` |
| **Owns** | Notification behaviour, UI, and server orchestration |
| **Public Doors** | `@/features/notifications` · `@/features/notifications/ui` · `@/features/notifications/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/notifications-core` |
| **Permitted Feature Dependencies** | _(none)_ |
| **Surfaces** | browser=true · server=true · ui=true |

### onboarding

| Field | Value |
|---|---|
| **Feature** | `onboarding` |
| **Source** | `src/features/onboarding/` |
| **Owns** | Merchant onboarding wizard |
| **Public Doors** | `@/features/onboarding` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `page-save`, `storage` |
| **Surfaces** | browser=true · server=false · ui=true |

### orders

| Field | Value |
|---|---|
| **Feature** | `orders` |
| **Source** | `src/features/orders/` |
| **Owns** | Orders presentation and server orchestration |
| **Public Doors** | `@/features/orders` · `@/features/orders/ui` · `@/features/orders/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/orders-core` |
| **Permitted Feature Dependencies** | `auth`, `cart`, `notifications`, `profile`, `system-logs` |
| **Surfaces** | browser=true · server=true · ui=true |

### ota

| Field | Value |
|---|---|
| **Feature** | `ota` |
| **Source** | `src/features/ota/` |
| **Owns** | OTA application wiring and server surfaces |
| **Public Doors** | `@/features/ota` · `@/features/ota/server` |
| **Runtime Targets** | `web`, `server` |
| **Capability Owners** | `@asol/ota-core` |
| **Permitted Feature Dependencies** | `auth`, `categories`, `system-logs` |
| **Surfaces** | browser=false · server=true · ui=false |

### page-save

| Field | Value |
|---|---|
| **Feature** | `page-save` |
| **Source** | `src/features/page-save/` |
| **Owns** | Page-save gateway application wiring and hooks |
| **Public Doors** | `@/features/page-save` · `@/features/page-save/ui` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | `@asol/page-save-core` |
| **Permitted Feature Dependencies** | `onboarding`, `storage` |
| **Surfaces** | browser=true · server=false · ui=true |

### page-snapshot

| Field | Value |
|---|---|
| **Feature** | `page-snapshot` |
| **Source** | `src/features/page-snapshot/` |
| **Owns** | Page snapshot application wiring |
| **Public Doors** | `@/features/page-snapshot` · `@/features/page-snapshot/ports` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | `@asol/page-snapshot-core` |
| **Permitted Feature Dependencies** | _(none)_ |
| **Surfaces** | browser=true · server=false · ui=true |

### password-recovery

| Field | Value |
|---|---|
| **Feature** | `password-recovery` |
| **Source** | `src/features/password-recovery/` |
| **Owns** | Password recovery flows |
| **Public Doors** | `@/features/password-recovery` · `@/features/password-recovery/ui` · `@/features/password-recovery/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `auth` |
| **Surfaces** | browser=true · server=true · ui=true |

### pharmacy-profile-catalog

| Field | Value |
|---|---|
| **Feature** | `pharmacy-profile-catalog` |
| **Source** | `src/features/pharmacy-profile-catalog/` |
| **Owns** | Pharmacy profile catalog editing |
| **Public Doors** | `@/features/pharmacy-profile-catalog` · `@/features/pharmacy-profile-catalog/ui` · `@/features/pharmacy-profile-catalog/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/product-core` |
| **Permitted Feature Dependencies** | `page-save`, `product` |
| **Surfaces** | browser=true · server=true · ui=true |

### product

| Field | Value |
|---|---|
| **Feature** | `product` |
| **Source** | `src/features/product/` |
| **Owns** | Product detail, style editors, and product services |
| **Public Doors** | `@/features/product` · `@/features/product/ui` · `@/features/product/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/product-core`, `@asol/product-style-core` |
| **Permitted Feature Dependencies** | `cart`, `categories`, `favorites`, `location`, `page-save`, `product-card`, `sharing`, `specialty-chat`, `storage`, `system-logs`, `vehicle-catalog` |
| **Surfaces** | browser=true · server=true · ui=true |

### product-card

| Field | Value |
|---|---|
| **Feature** | `product-card` |
| **Source** | `src/features/product-card/` |
| **Owns** | Product card view-model and presentation |
| **Public Doors** | `@/features/product-card` · `@/features/product-card/ui` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `favorites`, `product` |
| **Surfaces** | browser=true · server=false · ui=true |

### product-search

| Field | Value |
|---|---|
| **Feature** | `product-search` |
| **Source** | `src/features/product-search/` |
| **Owns** | Product search panel and page |
| **Public Doors** | `@/features/product-search` · `@/features/product-search/ui` · `@/features/product-search/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `categories`, `product`, `product-card`, `profile`, `seller-card`, `storage` |
| **Surfaces** | browser=true · server=true · ui=true |

### profile

| Field | Value |
|---|---|
| **Feature** | `profile` |
| **Source** | `src/features/profile/` |
| **Owns** | Seller/user profile surfaces |
| **Public Doors** | `@/features/profile` · `@/features/profile/ui` · `@/features/profile/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `advertisements`, `auth`, `categories`, `follow`, `location`, `page-save`, `page-snapshot`, `product`, `profile-products`, `profile-working-hours`, `seller-card`, `seller-discounts`, `sharing`, `specialty-chat`, `storage`, `system-logs` |
| **Surfaces** | browser=true · server=true · ui=true |

### profile-products

| Field | Value |
|---|---|
| **Feature** | `profile-products` |
| **Source** | `src/features/profile-products/` |
| **Owns** | Profile products tabs presentation |
| **Public Doors** | `@/features/profile-products` · `@/features/profile-products/ui` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | `@asol/product-core`, `@asol/data-core` |
| **Permitted Feature Dependencies** | `categories`, `page-snapshot`, `pharmacy-profile-catalog`, `product`, `product-card`, `product-search` |
| **Surfaces** | browser=true · server=false · ui=true |

### profile-working-hours

| Field | Value |
|---|---|
| **Feature** | `profile-working-hours` |
| **Source** | `src/features/profile-working-hours/` |
| **Owns** | Working hours card presentation |
| **Public Doors** | `@/features/profile-working-hours` · `@/features/profile-working-hours/ui` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | _(none)_ |
| **Surfaces** | browser=true · server=false · ui=true |

### qr-code

| Field | Value |
|---|---|
| **Feature** | `qr-code` |
| **Source** | `src/features/qr-code/` |
| **Owns** | QR code generation helpers |
| **Public Doors** | `@/features/qr-code` |
| **Runtime Targets** | `web` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | _(none)_ |
| **Surfaces** | browser=false · server=false · ui=false |

### release-commands

| Field | Value |
|---|---|
| **Feature** | `release-commands` |
| **Source** | `src/features/release-commands/` |
| **Owns** | Release build-job and production deploy orchestration |
| **Public Doors** | `@/features/release-commands` · `@/features/release-commands/ui` · `@/features/release-commands/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/notifications-core`, `@asol/release-core`, `@asol/vercel-deploy-core` |
| **Permitted Feature Dependencies** | `auth`, `google-play-console`, `notifications` |
| **Surfaces** | browser=true · server=true · ui=true |

### seller-card

| Field | Value |
|---|---|
| **Feature** | `seller-card` |
| **Source** | `src/features/seller-card/` |
| **Owns** | Seller card view-model and presentation |
| **Public Doors** | `@/features/seller-card` · `@/features/seller-card/ui` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `favorites`, `profile` |
| **Surfaces** | browser=true · server=false · ui=true |

### seller-discounts

| Field | Value |
|---|---|
| **Feature** | `seller-discounts` |
| **Source** | `src/features/seller-discounts/` |
| **Owns** | Seller discount rules UI and services |
| **Public Doors** | `@/features/seller-discounts` · `@/features/seller-discounts/ui` · `@/features/seller-discounts/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `cart`, `profile` |
| **Surfaces** | browser=true · server=true · ui=true |

### settings

| Field | Value |
|---|---|
| **Feature** | `settings` |
| **Source** | `src/features/settings/` |
| **Owns** | Settings screens |
| **Public Doors** | `@/features/settings` · `@/features/settings/ui` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `app-reset`, `auth`, `notifications`, `specialty-chat` |
| **Surfaces** | browser=true · server=false · ui=true |

### sharing

| Field | Value |
|---|---|
| **Feature** | `sharing` |
| **Source** | `src/features/sharing/` |
| **Owns** | Native/web sharing orchestration |
| **Public Doors** | `@/features/sharing` · `@/features/sharing/ui` · `@/features/sharing/server` |
| **Runtime Targets** | `web`, `server` |
| **Capability Owners** | `@asol/native-core` |
| **Permitted Feature Dependencies** | `product`, `profile`, `qr-code`, `system-logs` |
| **Surfaces** | browser=false · server=true · ui=true |

### simulation

| Field | Value |
|---|---|
| **Feature** | `simulation` |
| **Source** | `src/features/simulation/` |
| **Owns** | Super-admin real-user interaction simulation and runtime adapters |
| **Public Doors** | `@/features/simulation` · `@/features/simulation/ui` · `@/features/simulation/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/simulation-core` |
| **Permitted Feature Dependencies** | `auth`, `categories`, `profile` |
| **Surfaces** | browser=true · server=true · ui=true |

### specialty-chat

| Field | Value |
|---|---|
| **Feature** | `specialty-chat` |
| **Source** | `src/features/specialty-chat/` |
| **Owns** | Specialty chat surfaces |
| **Public Doors** | `@/features/specialty-chat` · `@/features/specialty-chat/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `auth`, `categories`, `notifications`, `product`, `profile` |
| **Surfaces** | browser=true · server=true · ui=true |

### splash

| Field | Value |
|---|---|
| **Feature** | `splash` |
| **Source** | `src/features/splash/` |
| **Owns** | Splash screen |
| **Public Doors** | `@/features/splash` · `@/features/splash/ui` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `auth`, `categories` |
| **Surfaces** | browser=true · server=false · ui=true |

### storage

| Field | Value |
|---|---|
| **Feature** | `storage` |
| **Source** | `src/features/storage/` |
| **Owns** | Storage upload application wiring and UI |
| **Public Doors** | `@/features/storage` · `@/features/storage/ui` · `@/features/storage/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/storage-core`, `@asol/storage-image-manager-core` |
| **Permitted Feature Dependencies** | `auth` |
| **Surfaces** | browser=true · server=true · ui=true |

### super-admin

| Field | Value |
|---|---|
| **Feature** | `super-admin` |
| **Source** | `src/features/super-admin/` |
| **Owns** | Super-admin operational UI |
| **Public Doors** | `@/features/super-admin` · `@/features/super-admin/ui` · `@/features/super-admin/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | `advertisements`, `auth`, `notifications`, `page-save`, `product`, `storage`, `system-logs` |
| **Surfaces** | browser=true · server=true · ui=true |

### system-logs

| Field | Value |
|---|---|
| **Feature** | `system-logs` |
| **Source** | `src/features/system-logs/` |
| **Owns** | System logs collector wiring and admin UI |
| **Public Doors** | `@/features/system-logs` · `@/features/system-logs/ui` · `@/features/system-logs/server` |
| **Runtime Targets** | `web`, `android`, `ios`, `server` |
| **Capability Owners** | `@asol/system-logs-core` |
| **Permitted Feature Dependencies** | `auth`, `page-save` |
| **Surfaces** | browser=true · server=true · ui=true |

### vehicle-catalog

| Field | Value |
|---|---|
| **Feature** | `vehicle-catalog` |
| **Source** | `src/features/vehicle-catalog/` |
| **Owns** | Vehicle catalog helpers |
| **Public Doors** | `@/features/vehicle-catalog` |
| **Runtime Targets** | `web` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | _(none)_ |
| **Surfaces** | browser=false · server=false · ui=false |

### voice-input

| Field | Value |
|---|---|
| **Feature** | `voice-input` |
| **Source** | `src/features/voice-input/` |
| **Owns** | Voice input UI helpers |
| **Public Doors** | `@/features/voice-input` · `@/features/voice-input/ui` |
| **Runtime Targets** | `web`, `android`, `ios` |
| **Capability Owners** | _(none)_ |
| **Permitted Feature Dependencies** | _(none)_ |
| **Surfaces** | browser=true · server=false · ui=true |

## Counts

| Metric | Value |
|---|---|
| Application features | 48 |
| Features with UI door | 33 |
| Features with server door | 27 |
| Sealed capability packages | 43 |
