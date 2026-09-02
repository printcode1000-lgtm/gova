/**
 * Canonical exact application seams used by isolated composition packages.
 *
 * Composition packages are allowed to import the application because they are
 * deployment roots, but service mirrors are built from the real module graph.
 * Importing a broad feature barrel can therefore pull capabilities and npm
 * dependencies into an account that must not have them. For that reason a
 * composition package may bypass a feature door only through an exact path
 * listed here. This is default-deny: target-wide or prefix-wide exemptions are
 * deliberately forbidden.
 */
export const COMPOSITION_FEATURE_SEAMS = {
  'control-composition': [
    '@/features/data/ports/data-core-runtime-config-ports',
  ],
  'notifications-composition': [
    '@/features/data/ports/data-core-runtime-config-ports',
  ],
  'orders-composition': [
    '@/features/auth/domain/super-admin',
    '@/features/data/ports/data-core-runtime-config-ports',
  ],
  'products-composition': [
    '@/features/product/server/services/product-service.server',
    '@/features/product/server/services/product-review-service.server',
    '@/features/product-search/server/services/product-search-products.server',
    '@/features/product-search/server/services/product-search-fields.server',
    '@/features/pharmacy-profile-catalog/server/services/pharmacy-profile-catalog.service.server',
    '@/features/pharmacy-profile-catalog/server/register-pharmacy-catalog-product-lookup-port',
    '@/features/data/ports/data-core-runtime-config-ports',
    '@/features/data/ports/data-core-specialty-catalog-port',
    '@/features/product-search/domain/product-search.types',
  ],
  'profiles-composition': [
    '@/features/profile/server/services/profile-service.bootstrap.server',
    // Seller discounts read the `profile-promotions` shard, and the storage
    // read turns a stored key into a URL — both credentials this account holds.
    '@/features/seller-discounts/server/services/seller-discount-service.server',
    '@/features/storage/server/services/image-storage-service.bootstrap.server',
    '@/features/data/ports/data-core-runtime-config-ports',
    '@/features/data/ports/data-core-specialty-catalog-port',
  ],
  'submain-composition': [
    '@/features/cart/server/services/cart-catalogue-pricing.server',
    // Auth and password recovery moved here with their routes: this account
    // owns login, registration, logout, phone lookup, profile updates and
    // recovery, and holds the session signing secret and users database.
    '@/features/auth/server/services/auth-service.bootstrap.server',
    '@/features/password-recovery/server/services/password-recovery-service.server',
    // The workloads that moved here with their routes. Each is an exact service
    // door, not a feature barrel: a barrel would widen the mirror graph to
    // capabilities this account has no credential for.
    '@/features/auth/server/services/account-deletion.bootstrap.server',
    '@/features/auth/server/session-request.server',
    '@/features/contact/server/services/contact-service.server',
    '@/features/feature-flags/server/services/feature-flag-service.server',
    '@/features/follow/server/services/follow-service.bootstrap.server',
    '@/features/advertisements/server/services/home-hero-slider-service.server',
    '@/features/advertisements/server/services/featured-marquee-service.server',
    '@/features/advertisements/server/services/trending-ribbon-service.server',
    '@/features/specialty-chat/server/services/specialty-chat-service.server',
    '@/features/notifications/server/services/notification-service.bootstrap.server',
    '@/features/storage/ports/storage-core-ports',
    '@/features/super-admin/server/services/super-admin-auth.server',
    '@/features/orders/application/order-detail-loader.server',
    '@/features/orders/application/order-actions.server',
    '@/features/orders/application/order-action-grants.server',
    '@/features/product-search/server/services/product-search-service.server',
    '@/features/product-search/server/services/product-search-fields.server',
    '@/features/auth/domain/super-admin',
    '@/features/data/ports/data-core-runtime-config-ports',
    '@/features/data/ports/data-core-specialty-catalog-port',
    '@/features/product-search/domain/product-search.types',
  ],
  'sub2main-composition': [
    '@/features/pharmacy-profile-catalog/server/services/pharmacy-profile-catalog.service.server',
    // Reviews: this account holds both the product and profile databases the
    // read and the write need, so it owns both families end to end.
    '@/features/product/server/services/product-review-service.server',
    '@/features/profile/server/services/profile-review-service.server',
    '@/features/product/server/services/product-service.server',
    '@/features/profile/server/services/profile-service.bootstrap.server',
    '@/features/storage/server/services/image-storage-service.bootstrap.server',
    '@/features/data/ports/data-core-runtime-config-ports',
    '@/features/data/ports/data-core-specialty-catalog-port',
    '@/features/product/domain/product.entity',
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export type CompositionFeatureSeamOwner = keyof typeof COMPOSITION_FEATURE_SEAMS;

export function isCompositionFeatureSeam(
  packageFolder: string,
  specifier: string,
): boolean {
  const seams = COMPOSITION_FEATURE_SEAMS[
    packageFolder as CompositionFeatureSeamOwner
  ] as readonly string[] | undefined;
  return seams?.includes(specifier) ?? false;
}
