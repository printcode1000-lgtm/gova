import {
  StorageProfiles,
  type StorageProfileId,
} from './storage-profiles.constants';

/** Catalog main-category ids for apparel/fashion and pets. */
export const APPAREL_PETS_MAIN_CATEGORY_IDS = ['1', '12'] as const;

/**
 * Onboarding fashion category slug ids from
 * `src/features/onboarding/domain/schemas.ts` → `constants.fashionCategories`.
 * These are not numeric catalog ids; treat all as apparel.
 */
export const ONBOARDING_FASHION_CATEGORY_IDS = [
  'menswear',
  'womenswear',
  'kids',
  'shoes',
  'bags',
  'jewelry',
  'sportswear',
  'casual',
  'formal',
  'custom',
] as const;

const APPAREL_PETS_SCOPES = new Set<string>([
  ...APPAREL_PETS_MAIN_CATEGORY_IDS,
  ...ONBOARDING_FASHION_CATEGORY_IDS,
]);

/**
 * Resolves which product storage profile should receive a new upload.
 * Unknown / empty scopes stay on the legacy product-default account.
 */
export function resolveProductStorageProfileId(
  scope: string | null | undefined,
): StorageProfileId {
  const normalized = typeof scope === 'string' ? scope.trim() : '';
  if (normalized && APPAREL_PETS_SCOPES.has(normalized)) {
    return StorageProfiles.ProductApparelPets;
  }
  return StorageProfiles.ProductDefault;
}

/**
 * Best-effort profile from an image key's first path segment
 * (`<scope>/<uuid>.webp`). Unknown segments → product-default.
 */
export function resolveProductStorageProfileIdFromImageKey(
  imageKey: string,
): StorageProfileId {
  const firstSegment = imageKey.split('/')[0]?.trim() ?? '';
  return resolveProductStorageProfileId(firstSegment);
}
