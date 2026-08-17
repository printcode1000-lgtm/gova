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
    discounts: "/api/profile/discounts",
    discountQuote: "/api/profile/discounts/quote",
    usersBySpecialty: "/api/profile/users-by-specialty",
    fulfillmentSettings: "/api/profile/fulfillment-settings",
    reviews: {
      root: "/api/profile/reviews",
      helpful: "/api/profile/reviews/helpful",
      reply: "/api/profile/reviews/reply",
    },
  },
  systemLogs: {
    root: "/api/system-logs",
    ingest: "/api/system-logs/ingest",
    summary: "/api/system-logs/summary",
    stream: "/api/system-logs/stream",
  },
  follow: {
    root: "/api/follow",
    status: "/api/follow/status",
    notifications: "/api/follow/notifications",
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
    // No `send` entry: push fan-out lives only on the notifications service
    // (services/notifications), reached through NotificationSendService.
    deviceToken: "/api/notifications/device-token",
    preferences: "/api/notifications/preferences",
    broadcastRecipients: "/api/notifications/broadcast/recipients",
    broadcastSend: "/api/notifications/broadcast/send",
    testSend: "/api/notifications/test/send",
    // No web-push entries: the VAPID public key is a constant in the bundle
    // (features/notifications/domain/web-push-config.ts), so subscribing needs
    // no server call and there is nothing for an admin API to edit.
  },
  featureFlags: "/api/feature-flags",
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
