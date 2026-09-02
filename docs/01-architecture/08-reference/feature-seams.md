<!-- GENERATED FILE — DO NOT EDIT. Run `npm run architecture:docs`. -->

# Composition Feature Seams

Feature-to-feature dependencies have no deep-import exceptions: they must use declared Public API doors.
The only exact application paths listed here belong to composition/service-mirror packages whose isolated import graphs must remain narrower than a broad feature barrel.

## Source of Truth

- `packages/architecture-core/src/registry/composition-feature-seams-registry.ts`

Current inventory: **51** exact composition seam path(s).

| Composition package | Exact application module |
| --- | --- |
| `control-composition` | `@/features/data/ports/data-core-runtime-config-ports` |
| `notifications-composition` | `@/features/data/ports/data-core-runtime-config-ports` |
| `orders-composition` | `@/features/auth/domain/super-admin` |
| `orders-composition` | `@/features/data/ports/data-core-runtime-config-ports` |
| `products-composition` | `@/features/product/server/services/product-service.server` |
| `products-composition` | `@/features/product/server/services/product-review-service.server` |
| `products-composition` | `@/features/product-search/server/services/product-search-products.server` |
| `products-composition` | `@/features/product-search/server/services/product-search-fields.server` |
| `products-composition` | `@/features/pharmacy-profile-catalog/server/services/pharmacy-profile-catalog.service.server` |
| `products-composition` | `@/features/pharmacy-profile-catalog/server/register-pharmacy-catalog-product-lookup-port` |
| `products-composition` | `@/features/data/ports/data-core-runtime-config-ports` |
| `products-composition` | `@/features/data/ports/data-core-specialty-catalog-port` |
| `products-composition` | `@/features/product-search/domain/product-search.types` |
| `profiles-composition` | `@/features/profile/server/services/profile-service.bootstrap.server` |
| `profiles-composition` | `@/features/seller-discounts/server/services/seller-discount-service.server` |
| `profiles-composition` | `@/features/storage/server/services/image-storage-service.bootstrap.server` |
| `profiles-composition` | `@/features/data/ports/data-core-runtime-config-ports` |
| `profiles-composition` | `@/features/data/ports/data-core-specialty-catalog-port` |
| `submain-composition` | `@/features/cart/server/services/cart-catalogue-pricing.server` |
| `submain-composition` | `@/features/auth/server/services/auth-service.bootstrap.server` |
| `submain-composition` | `@/features/password-recovery/server/services/password-recovery-service.server` |
| `submain-composition` | `@/features/auth/server/services/account-deletion.bootstrap.server` |
| `submain-composition` | `@/features/auth/server/session-request.server` |
| `submain-composition` | `@/features/contact/server/services/contact-service.server` |
| `submain-composition` | `@/features/feature-flags/server/services/feature-flag-service.server` |
| `submain-composition` | `@/features/follow/server/services/follow-service.bootstrap.server` |
| `submain-composition` | `@/features/advertisements/server/services/home-hero-slider-service.server` |
| `submain-composition` | `@/features/advertisements/server/services/featured-marquee-service.server` |
| `submain-composition` | `@/features/advertisements/server/services/trending-ribbon-service.server` |
| `submain-composition` | `@/features/specialty-chat/server/services/specialty-chat-service.server` |
| `submain-composition` | `@/features/notifications/server/services/notification-service.bootstrap.server` |
| `submain-composition` | `@/features/storage/ports/storage-core-ports` |
| `submain-composition` | `@/features/super-admin/server/services/super-admin-auth.server` |
| `submain-composition` | `@/features/orders/application/order-detail-loader.server` |
| `submain-composition` | `@/features/orders/application/order-actions.server` |
| `submain-composition` | `@/features/orders/application/order-action-grants.server` |
| `submain-composition` | `@/features/product-search/server/services/product-search-service.server` |
| `submain-composition` | `@/features/product-search/server/services/product-search-fields.server` |
| `submain-composition` | `@/features/auth/domain/super-admin` |
| `submain-composition` | `@/features/data/ports/data-core-runtime-config-ports` |
| `submain-composition` | `@/features/data/ports/data-core-specialty-catalog-port` |
| `submain-composition` | `@/features/product-search/domain/product-search.types` |
| `sub2main-composition` | `@/features/pharmacy-profile-catalog/server/services/pharmacy-profile-catalog.service.server` |
| `sub2main-composition` | `@/features/product/server/services/product-review-service.server` |
| `sub2main-composition` | `@/features/profile/server/services/profile-review-service.server` |
| `sub2main-composition` | `@/features/product/server/services/product-service.server` |
| `sub2main-composition` | `@/features/profile/server/services/profile-service.bootstrap.server` |
| `sub2main-composition` | `@/features/storage/server/services/image-storage-service.bootstrap.server` |
| `sub2main-composition` | `@/features/data/ports/data-core-runtime-config-ports` |
| `sub2main-composition` | `@/features/data/ports/data-core-specialty-catalog-port` |
| `sub2main-composition` | `@/features/product/domain/product.entity` |

## Enforcement

- Feature-to-feature deep imports always fail.
- Relative traversal cannot bypass feature Public API doors or composition seams.
- Composition seams must be exact, existing, registered, and actively used.
- Stale, duplicate, missing, or broad composition seam authority fails `architecture:check`.
