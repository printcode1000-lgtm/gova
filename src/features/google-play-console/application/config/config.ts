export const GOOGLE_PLAY_CONSOLE_API = {
  snapshot: "/api/super-admin/google-play-console",
} as const;

export const RELEASE_CONSOLE_ROUTE = "/dev/release-console";

export const GOOGLE_PLAY_STORE_ASSETS_API = {
  snapshot: "/api/super-admin/google-play-store-assets",
  uploadImage: "/api/super-admin/google-play-store-assets/images/upload",
  deleteImage: "/api/super-admin/google-play-store-assets/images/delete",
  deleteListing: "/api/super-admin/google-play-store-assets/listings/delete",
  backups: "/api/super-admin/google-play-store-assets/backups",
  restoreBackup: "/api/super-admin/google-play-store-assets/backups/restore",
  tracks: "/api/super-admin/google-play-store-assets/tracks",
  promote: "/api/super-admin/google-play-store-assets/tracks/promote",
  uploadMapping: "/api/super-admin/google-play-store-assets/mapping/upload",
  fastlane: "/api/super-admin/google-play-store-assets/fastlane",
} as const;
