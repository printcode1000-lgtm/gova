/**
 * Canonical GOVA Business API routes.
 * Feature services reference these — never hardcode paths in UI or hooks.
 */
export const GOVA_API_ROUTES = {
  health: "/api/health",
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
    profile: "/api/auth/profile",
  },
  profile: {
    contacts: "/api/profile/contacts",
    storeImages: "/api/profile/store-images",
    storeDetails: "/api/profile/store-details",
    specialties: "/api/profile/specialties",
    editor: "/api/profile/editor",
  },
  storage: {
    upload: "/api/storage/images/upload",
    profile: (profileId: string) =>
      `/api/storage/profiles/${encodeURIComponent(profileId)}`,
    deleteImage: (imageKey: string) =>
      `/api/storage/images/${encodeURIComponent(imageKey)}`,
  },
  dev: {
    productStyle: "/api/dev/product-style",
  },
  products: "/api/products",
} as const;
