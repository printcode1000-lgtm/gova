<!-- GENERATED FILE — DO NOT EDIT. Run `npm run architecture:docs`. -->

# Composition Feature Seams

Feature-to-feature dependencies have no deep-import exceptions: they must use declared Public API doors.
The only exact application paths listed here belong to composition/service-mirror packages whose isolated import graphs must remain narrower than a broad feature barrel.

## Source of Truth

- `packages/architecture-core/src/registry/composition-feature-seams-registry.ts`

Current inventory: **28** exact composition seam path(s).

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

- Feature-to-feature deep imports always fail.
- Relative traversal cannot bypass feature Public API doors or composition seams.
- Composition seams must be exact, existing, registered, and actively used.
- Stale, duplicate, missing, or broad composition seam authority fails `architecture:check`.
