export const GOOGLE_PLAY_CONSOLE_ROUTE = "/super-admin/google-play-console";

export const GOOGLE_PLAY_CONSOLE_API = {
  snapshot: "/api/super-admin/google-play-console",
} as const;

export const GOOGLE_PLAY_STORE_ASSETS_ROUTE =
  "/super-admin/google-play-store-assets";

export const GOOGLE_PLAY_STORE_ASSETS_API = {
  snapshot: "/api/super-admin/google-play-store-assets",
  uploadImage: "/api/super-admin/google-play-store-assets/images/upload",
  deleteImage: "/api/super-admin/google-play-store-assets/images/delete",
  fastlane: "/api/super-admin/google-play-store-assets/fastlane",
} as const;
