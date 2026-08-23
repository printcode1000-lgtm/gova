<!-- GENERATED FILE — DO NOT EDIT. Run `npm run architecture:docs`. -->

# Exact Feature Seams

This reference is generated from the machine-readable seam registries owned by `@asol/architecture-core`.
Public feature doors remain the default boundary. A deep path has no authority unless it is registered exactly and remains in active use; stale entries fail `architecture:check`.

Canonical sources:
- `packages/architecture-core/src/registry/application-features-registry.ts` — declares allowed target-feature relationships, but grants no deep-path authority by itself.
- `packages/architecture-core/src/registry/feature-deep-import-seams-registry.ts` — exact feature-to-feature source modules.
- `packages/architecture-core/src/registry/composition-feature-seams-registry.ts` — exact composition/service-mirror source modules.

Current inventory: **10** exact feature-to-feature seam path(s) and **28** exact composition seam path(s).

## Feature-to-feature exact seams

| Importer feature | Exact target module |
| --- | --- |
| `advertisements` | `src/features/profile/presentation/image-configs/storefront-images.image.json` |
| `notifications` | `src/features/orders/order-data-refresh` |
| `notifications` | `src/features/auth/presentation/SessionProvider` |
| `notifications` | `src/features/auth/application/auth-lifecycle-events` |
| `notifications` | `src/features/specialty-chat/domain/types` |
| `notifications` | `src/features/auth/utils/super-admin` |
| `release-commands` | `src/features/google-play-console/domain/development-guard.server` |
| `release-commands` | `src/features/google-play-console/presentation/android-release-runbook-copy` |
| `release-commands` | `src/features/google-play-console/presentation/components/android-release-paths-data` |
| `release-commands` | `src/features/google-play-console/presentation/deploy-runbook-copy` |

## Composition/service-mirror exact seams

These exceptions exist because isolated service mirrors follow the real import graph. Importing a broad application barrel can pull capabilities or npm dependencies into an account that must not own them.

| Composition package | Exact application module |
| --- | --- |
| `notifications-composition` | `@/features/data/data-core-runtime-config-ports` |
| `orders-composition` | `@/features/auth/utils/super-admin` |
| `orders-composition` | `@/features/data/data-core-runtime-config-ports` |
| `products-composition` | `@/features/product/services/product-service.server` |
| `products-composition` | `@/features/product/services/product-review-service.server` |
| `products-composition` | `@/features/product-search/services/product-search-products.server` |
| `products-composition` | `@/features/product-search/services/product-search-fields.server` |
| `products-composition` | `@/features/pharmacy-profile-catalog/services/pharmacy-profile-catalog.service.server` |
| `products-composition` | `@/features/data/data-core-runtime-config-ports` |
| `products-composition` | `@/features/data/data-core-specialty-catalog-port` |
| `products-composition` | `@/features/product-search/domain/product-search.types` |
| `profiles-composition` | `@/features/profile/services/profile-service.bootstrap.server` |
| `profiles-composition` | `@/features/data/data-core-runtime-config-ports` |
| `profiles-composition` | `@/features/data/data-core-specialty-catalog-port` |
| `submain-composition` | `@/features/cart/services/cart-catalogue-pricing.server` |
| `submain-composition` | `@/features/product-search/services/product-search-service.server` |
| `submain-composition` | `@/features/product-search/services/product-search-fields.server` |
| `submain-composition` | `@/features/auth/utils/super-admin` |
| `submain-composition` | `@/features/data/data-core-runtime-config-ports` |
| `submain-composition` | `@/features/data/data-core-specialty-catalog-port` |
| `submain-composition` | `@/features/product-search/domain/product-search.types` |
| `sub2main-composition` | `@/features/pharmacy-profile-catalog/services/pharmacy-profile-catalog.service.server` |
| `sub2main-composition` | `@/features/product/services/product-service.server` |
| `sub2main-composition` | `@/features/profile/services/profile-service.bootstrap.server` |
| `sub2main-composition` | `@/features/storage/services/image-storage-service.bootstrap.server` |
| `sub2main-composition` | `@/features/data/data-core-runtime-config-ports` |
| `sub2main-composition` | `@/features/data/data-core-specialty-catalog-port` |
| `sub2main-composition` | `@/features/product/domain/product.entity` |

## Enforcement

- Unknown deep imports fail.
- Relative traversal cannot bypass composition seams.
- A feature target declaration without an exact path fails.
- An exact feature seam whose target relationship is not declared fails.
- Missing, duplicate, or unused seam entries fail.
- Declared public doors (`.`, `/ui`, `/server`) do not belong in these exception registries.
