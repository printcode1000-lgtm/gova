/**
 * Canonical ASOL Business API routes.
 * Feature services reference these — never hardcode paths in UI or hooks.
 */
export const ASOL_API_ROUTES = {
  health: "/api/health",
  contact: "/api/contact",
  accountDeletion: "/api/account/delete",
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
    profile: "/api/auth/profile",
    checkPhone: "/api/auth/check-phone",
    passwordRecovery: {
      request: "/api/auth/password-recovery/request",
      verify: "/api/auth/password-recovery/verify",
      reset: "/api/auth/password-recovery/reset",
    },
  },
  profile: {
    contacts: "/api/profile/contacts",
    storeImages: "/api/profile/store-images",
    storeDetails: "/api/profile/store-details",
    specialties: "/api/profile/specialties",
    editor: "/api/profile/editor",
    usersBySpecialty: "/api/profile/users-by-specialty",
    fulfillmentSettings: "/api/profile/fulfillment-settings",
    reviews: {
      root: "/api/profile/reviews",
      helpful: "/api/profile/reviews/helpful",
      reply: "/api/profile/reviews/reply",
    },
  },
  follow: {
    root: "/api/follow",
    status: "/api/follow/status",
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
  orders: {
    root: "/api/orders",
    fromCart: "/api/orders/from-cart",
    customRequestFromProfile: "/api/orders/custom-request-from-profile",
    byId: (orderId: string) => `/api/orders/${encodeURIComponent(orderId)}`,
    actions: (orderId: string) =>
      `/api/orders/${encodeURIComponent(orderId)}/actions`,
  },
  notifications: {
    deviceToken: "/api/notifications/device-token",
    send: "/api/notifications/send",
    broadcastRecipients: "/api/notifications/broadcast/recipients",
    broadcastSend: "/api/notifications/broadcast/send",
    webPushPublicKey: "/api/notifications/web-push/public-key",
    webPushVapid: "/api/notifications/web-push/vapid",
  },
  ota: {
    access: "/api/ota/access",
    adminReleases: "/api/ota/admin/releases",
    adminReleaseDiff: "/api/ota/admin/releases/diff",
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
