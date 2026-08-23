/**
 * Public branding contract shared by web, native configuration, and push
 * transports. Asset generation stays behind the `./tooling` door.
 */
/**
 * The full-resolution icon, 1024px. For surfaces that want the large original:
 * the Open Graph share image, and `next/image` consumers, which resize on the
 * server and so pay for the source only once at build time.
 */
export const BRANDING_WEB_APP_ICON_PATH = "/logo.png";

/**
 * The browser tab and `apple-touch-icon`, 192px.
 *
 * These are raw `<link>` tags — nothing resizes them, so whatever is named here
 * is downloaded verbatim on first paint. Pointing them at the 1024px original
 * shipped 593KB for a tab icon on a phone-only application, against 30KB here
 * for a size no browser renders above 180px anyway.
 *
 * It happens to be the same file as the Web Push icon today, because one
 * 192px square satisfies both. They are named apart so either can move without
 * dragging the other: a push icon answers to the notification tray, a favicon
 * to the browser chrome.
 */
export const BRANDING_WEB_BROWSER_ICON_PATH = "/icons/asol-app-icon-192.png";

export const BRANDING_WEB_PUSH_ICON_PATH = "/icons/asol-app-icon-192.png";
export const BRANDING_WEB_PUSH_BADGE_PATH =
  "/icons/asol-notification-badge-96.png";

export const BRANDING_ANDROID_NOTIFICATION_SMALL_ICON =
  "ic_stat_asol_notification";
export const BRANDING_ANDROID_NOTIFICATION_LARGE_ICON =
  "asol_notification_large_icon";
export const BRANDING_ANDROID_NOTIFICATION_COLOR = "#006C4C";
