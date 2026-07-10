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
    checkPhone: "/api/auth/check-phone",
  },
  profile: {
    contacts: "/api/profile/contacts",
    storeImages: "/api/profile/store-images",
    storeDetails: "/api/profile/store-details",
    specialties: "/api/profile/specialties",
    editor: "/api/profile/editor",
    usersBySpecialty: "/api/profile/users-by-specialty",
    reviews: {
      root: "/api/profile/reviews",
      helpful: "/api/profile/reviews/helpful",
      reply: "/api/profile/reviews/reply",
    },
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
  advertisements: {
    homeHeroSlider: "/api/advertisements/home-hero-slider",
    homeHeroSliderVersion: "/api/advertisements/home-hero-slider/version",
    featuredMarquee: "/api/advertisements/featured-marquee",
    featuredMarqueeVersion: "/api/advertisements/featured-marquee/version",
    trendingRibbon: "/api/advertisements/trending-ribbon",
    trendingRibbonVersion: "/api/advertisements/trending-ribbon/version",
  },
  productReviews: {
    root: "/api/products/reviews",
    helpful: "/api/products/reviews/helpful",
    reply: "/api/products/reviews/reply",
  },
} as const;
