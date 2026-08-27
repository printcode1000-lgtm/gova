<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->

# Repository Catalog

## Inventory

| Kind | Count |
|---|---:|
| artifact | 4 |
| command | 259 |
| config | 12 |
| document | 250 |
| domain | 10 |
| environment-key | 236 |
| external-dependency | 106 |
| feature | 48 |
| package | 43 |
| route | 180 |
| runtime | 7 |
| script | 142 |
| service | 6 |
| source | 2116 |
| test | 230 |

## Domains

| Name | Path | Summary |
|---|---|---|
| agent-knowledge | `docs/09-agent-knowledge/` | Documentation domain for docs/09-agent-knowledge/ |
| architecture | `docs/01-architecture/` | Documentation domain for docs/01-architecture/ |
| data-and-storage | `docs/02-data-and-storage/` | Documentation domain for docs/02-data-and-storage/ |
| mobile-and-release | `docs/07-mobile-and-release/` | Documentation domain for docs/07-mobile-and-release/ |
| overview | `docs/00-overview/` | Documentation domain for docs/00-overview/ |
| platform-features | `docs/05-platform-features/` | Documentation domain for docs/05-platform-features/ |
| products-and-commerce | `docs/03-products-and-commerce/` | Documentation domain for docs/03-products-and-commerce/ |
| super-admin-and-operations | `docs/06-super-admin-and-operations/` | Documentation domain for docs/06-super-admin-and-operations/ |
| troubleshooting | `docs/08-troubleshooting/` | Documentation domain for docs/08-troubleshooting/ |
| ui-components | `docs/04-ui-components/` | Documentation domain for docs/04-ui-components/ |

## Packages

| Name | Path | Summary |
|---|---|---|
| @asol/account-bridge | `packages/account-bridge` | Cross-account notification and identity bridging; Layer: bridge; Public exports: ., ./notifications |
| @asol/account-declarations | `packages/account-declarations` | Deployment account declarations and routing metadata; Layer: declarations; Public exports: ., ./gova, ./notifications, ./orders, ./products, ./profiles, ./sub2main, ./submain |
| @asol/architecture-core | `packages/architecture-core` | Repository architecture contracts and static enforcement; Layer: enforcement; Public exports: . |
| @asol/auth-core | `packages/auth-core` | Authentication and session identity; Layer: capability; Public exports: ., ./server |
| @asol/backup-core | `packages/backup-core` | Backup orchestration over storage ports; Layer: capability; Public exports: ., ./server |
| @asol/branding-core | `packages/branding-core` | App icon identity and generated branding assets; Layer: capability; Public exports: ., ./tooling |
| @asol/catalog-core | `packages/catalog-core` | Category catalog domain; Layer: capability; Public exports: ., ./server |
| @asol/data-core | `packages/data-core` | Database access, sharding, and domain repositories; Layer: capability; Public exports: ., ./account-deletion, ./advertisements, ./auth, ./auth/entities, ./browser, ./composition, ./data-health, ./dev-cloud-backup, ./feature-flags, ./follow, ./follow/entities, ./marketplace-orders, ./notifications, ./ota, ./password-recovery, ./pharmacy-profile-catalog, ./pharmacy-profile-catalog/entities, ./product, ./product-search, ./product-search-fields, ./product-search/entities, ./product/entities, ./profile, ./profile/entities, ./provisioning, ./runtime-config, ./seller-discounts, ./seller-discounts/entities, ./super-admin, ./system-logs, ./telemetry, ./tooling, ./ui-registry |
| @asol/data-health-core | `packages/data-health-core` | Schema health and data integrity checks; Layer: capability; Public exports: ., ./server |
| @asol/dev-core | `packages/dev-core` | Developer-only tooling surfaces; Layer: capability; Public exports: ., ./server |
| @asol/env-core | `packages/env-core` | Environment variable reading rules; Layer: capability; Public exports: ., ./files, ./process |
| @asol/featured-marquee-core | `packages/featured-marquee-core` | Featured marquee UI capability; Layer: capability; Public exports: ., ./server |
| @asol/format-core | `packages/format-core` | Formatting helpers with a single owner; Layer: capability; Public exports: . |
| @asol/google-play-store-assets-core | `packages/google-play-store-assets-core` | Google Play store listing image assets; Layer: capability; Public exports: ., ./images |
| @asol/hero-slider-core | `packages/hero-slider-core` | Hero slider UI capability; Layer: capability; Public exports: ., ./server |
| @asol/map-core | `packages/map-core` | MapLibre map capability; Layer: capability; Public exports: . |
| @asol/native-core | `packages/native-core` | Capacitor / native device capabilities; Layer: capability; Public exports: ., ./platform-globals, ./scripts/android-build-preflight, ./scripts/validate-android-r8-policy |
| @asol/notifications-composition | `packages/notifications-composition` | Composition root for the notifications account; Layer: composition; Public exports: . |
| @asol/notifications-core | `packages/notifications-core` | Push notification delivery (Web Push, FCM HTTP v1, APNs); Layer: capability; Public exports: ., ./builder, ./providers, ./server |
| @asol/observability-core | `packages/observability-core` | Observability and telemetry ports; Layer: capability; Public exports: ., ./dev-trace, ./server |
| @asol/orders-composition | `packages/orders-composition` | Composition root for the orders account; Layer: composition; Public exports: . |
| @asol/orders-core | `packages/orders-core` | Order domain meaning and policies; Layer: capability; Public exports: . |
| @asol/ota-core | `packages/ota-core` | OTA publishing and update runtime; Layer: capability; Public exports: ., ./publishing, ./server |
| @asol/page-save-core | `packages/page-save-core` | Mandatory gateway for page-authored persistence; Layer: capability; Public exports: . |
| @asol/page-snapshot-core | `packages/page-snapshot-core` | Page snapshot capture and restore; Layer: capability; Public exports: . |
| @asol/product-core | `packages/product-core` | Product domain logic; Layer: capability; Public exports: ., ./server |
| @asol/product-style-core | `packages/product-style-core` | Product presentation style rules; Layer: capability; Public exports: ., ./server |
| @asol/products-composition | `packages/products-composition` | Composition root for the products account; Layer: composition; Public exports: . |
| @asol/profiles-composition | `packages/profiles-composition` | Composition root for the profiles account; Layer: composition; Public exports: . |
| @asol/release-core | `packages/release-core` | Release console and runbooks; Layer: capability; Public exports: ., ./console, ./console-artifacts, ./console-server, ./console/android-release-runbook |
| @asol/secrets-core | `packages/secrets-core` | Secrets archive backup and restore; Layer: capability; Public exports: . |
| @asol/service-mirror-core | `packages/service-mirror-core` | Service source mirroring into services/*; Layer: capability; Public exports: . |
| @asol/service-runtime-core | `packages/service-runtime-core` | Shared service runtime helpers; Layer: capability; Public exports: . |
| @asol/signed-token-core | `packages/signed-token-core` | Signed token create/verify; Layer: capability; Public exports: . |
| @asol/simulation-core | `packages/simulation-core` | Real-user page interaction simulation and coverage discovery; Layer: capability; Public exports: ., ./discovery |
| @asol/storage-core | `packages/storage-core` | Object storage (R2/S3) access; Layer: capability; Public exports: ., ./profiles-config, ./server |
| @asol/storage-image-manager-core | `packages/storage-image-manager-core` | Image manager UI and client lifecycle over storage ports; Layer: capability; Public exports: ., ./client-lifecycle, ./services |
| @asol/sub2main-composition | `packages/sub2main-composition` | Composition root for the sub2main account; Layer: composition; Public exports: . |
| @asol/submain-composition | `packages/submain-composition` | Composition root for the submain account; Layer: composition; Public exports: . |
| @asol/system-logs-core | `packages/system-logs-core` | System log capture and persistence contract; Layer: capability; Public exports: ., ./server |
| @asol/trending-ribbon-core | `packages/trending-ribbon-core` | Trending ribbon UI capability; Layer: capability; Public exports: ., ./server |
| @asol/ui-registry-core | `packages/ui-registry-core` | UiRegistry identity contract, page registry, and DOM attribute builders; Layer: capability; Public exports: . |
| @asol/vercel-deploy-core | `packages/vercel-deploy-core` | Vercel deployment orchestration; Layer: capability; Public exports: ., ./remote-deploy-contracts, ./remote-deploy-sandbox |

## Features

| Name | Path | Summary |
|---|---|---|
| account-bridge | `src/features/account-bridge` |  |
| advertisements | `src/features/advertisements` |  |
| app-reset | `src/features/app-reset` |  |
| auth | `src/features/auth` |  |
| cart | `src/features/cart` |  |
| catalog-studio | `src/features/catalog-studio` |  |
| categories | `src/features/categories` |  |
| contact | `src/features/contact` |  |
| data | `src/features/data` |  |
| data-health | `src/features/data-health` |  |
| dev-cloud-backup | `src/features/dev-cloud-backup` |  |
| dev-tools | `src/features/dev-tools` |  |
| favorites | `src/features/favorites` |  |
| feature-flags | `src/features/feature-flags` |  |
| follow | `src/features/follow` |  |
| google-play-console | `src/features/google-play-console` |  |
| home | `src/features/home` |  |
| location | `src/features/location` |  |
| navigation | `src/features/navigation` |  |
| network | `src/features/network` |  |
| notifications | `src/features/notifications` |  |
| onboarding | `src/features/onboarding` |  |
| orders | `src/features/orders` |  |
| ota | `src/features/ota` |  |
| page-save | `src/features/page-save` |  |
| page-snapshot | `src/features/page-snapshot` |  |
| password-recovery | `src/features/password-recovery` |  |
| pharmacy-profile-catalog | `src/features/pharmacy-profile-catalog` |  |
| product | `src/features/product` |  |
| product-card | `src/features/product-card` |  |
| product-search | `src/features/product-search` |  |
| profile | `src/features/profile` |  |
| profile-products | `src/features/profile-products` |  |
| profile-working-hours | `src/features/profile-working-hours` |  |
| qr-code | `src/features/qr-code` |  |
| release-commands | `src/features/release-commands` |  |
| seller-card | `src/features/seller-card` |  |
| seller-discounts | `src/features/seller-discounts` |  |
| settings | `src/features/settings` |  |
| sharing | `src/features/sharing` |  |
| simulation | `src/features/simulation` |  |
| specialty-chat | `src/features/specialty-chat` |  |
| splash | `src/features/splash` |  |
| storage | `src/features/storage` |  |
| super-admin | `src/features/super-admin` |  |
| system-logs | `src/features/system-logs` |  |
| vehicle-catalog | `src/features/vehicle-catalog` |  |
| voice-input | `src/features/voice-input` |  |

## Services

| Name | Path | Summary |
|---|---|---|
| notifications | `services/notifications` |  |
| orders | `services/orders` |  |
| products | `services/products` |  |
| profiles | `services/profiles` |  |
| sub2main | `services/sub2main` |  |
| submain | `services/submain` |  |

## Runtimes

| Name | Path | Summary |
|---|---|---|
| Android | `` | Capacitor Android shell. Production consumes out/ as webDir and adds Android-native plugins, policies, resources, signing and store artifacts. |
| Development | `` | Next.js development runtime on port 3001; Capacitor can optionally live-reload from it through CAPACITOR_SERVER_URL. |
| iOS | `` | Capacitor iOS shell. Production consumes out/ as webDir and adds iOS-native plugins, entitlements, signing, archive and TestFlight/App Store behavior. |
| Independent services | `` | Separately deployed service runtimes under services/*; they are not exercised by the root next start process. |
| Static out | `` | Static Next.js export in out/. It has no bundled src/app/api handlers and must use a remote API base URL; it is the web payload copied into native shells. |
| Tooling | `` | Repository scripts, generators, validation, deployment orchestration and release tooling executed by Node/npm. |
| Web | `` | Server-capable Next.js web application. Production builds produce .next and deployment may run on Vercel/serverless infrastructure. |

## Artifacts

| Name | Path | Summary |
|---|---|---|
| Android release package (APK/AAB) | `` | Android package/store artifact created from the Capacitor Android project after the static web payload is prepared. |
| iOS archive/store artifact | `` | iOS archive/TestFlight/App Store artifact created from the Capacitor iOS project after the static web payload is prepared. |
| Next server build (.next) | `.next` | Server-capable Next.js build output produced by npm run build and consumed by the web runtime. |
| Static export (out/) | `out` | Release static web bundle produced by npm run build:static and consumed by static preview, Android and iOS. |
