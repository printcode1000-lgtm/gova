/** Storage profile contract ids — the only storage identifiers UI may reference. */
export const StorageProfiles = {
  Avatar: "avatar",
  Cover: "cover",
  ProductDefault: "product-default",
  HomeHeroSlider: "home-hero-slider",
  SpicialOrder: "spicialOrder",
} as const;

export type StorageProfileId =
  (typeof StorageProfiles)[keyof typeof StorageProfiles];

/** Root segment for all object paths (local + cloud). */
export const STORAGE_IMAGES_ROOT = "images";
