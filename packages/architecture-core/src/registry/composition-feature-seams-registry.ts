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
  'notifications-composition': [
    '@/features/data/data-core-runtime-config-ports',
  ],
  'orders-composition': [
    '@/features/auth/utils/super-admin',
    '@/features/data/data-core-runtime-config-ports',
  ],
  'products-composition': [
    '@/features/product/services/product-service.server',
    '@/features/product/services/product-review-service.server',
    '@/features/product-search/services/product-search-products.server',
    '@/features/product-search/services/product-search-fields.server',
    '@/features/pharmacy-profile-catalog/services/pharmacy-profile-catalog.service.server',
    '@/features/data/data-core-runtime-config-ports',
    '@/features/data/data-core-specialty-catalog-port',
    '@/features/product-search/domain/product-search.types',
  ],
  'profiles-composition': [
    '@/features/profile/services/profile-service.bootstrap.server',
    '@/features/data/data-core-runtime-config-ports',
    '@/features/data/data-core-specialty-catalog-port',
  ],
  'submain-composition': [
    '@/features/cart/services/cart-catalogue-pricing.server',
    '@/features/product-search/services/product-search-service.server',
    '@/features/product-search/services/product-search-fields.server',
    '@/features/auth/utils/super-admin',
    '@/features/data/data-core-runtime-config-ports',
    '@/features/data/data-core-specialty-catalog-port',
    '@/features/product-search/domain/product-search.types',
  ],
  'sub2main-composition': [
    '@/features/pharmacy-profile-catalog/services/pharmacy-profile-catalog.service.server',
    '@/features/product/services/product-service.server',
    '@/features/profile/services/profile-service.bootstrap.server',
    '@/features/storage/services/image-storage-service.bootstrap.server',
    '@/features/data/data-core-runtime-config-ports',
    '@/features/data/data-core-specialty-catalog-port',
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
