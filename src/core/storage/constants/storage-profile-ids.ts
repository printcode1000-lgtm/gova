/** Storage Profile contract ids — the only storage identifiers UI may reference. */
export const STORAGE_PROFILE_IDS = {
  AVATAR: 'avatar',
  COVER: 'cover',
  PRODUCT_DEFAULT: 'product-default',
} as const;

export type StorageProfileId = (typeof STORAGE_PROFILE_IDS)[keyof typeof STORAGE_PROFILE_IDS];
