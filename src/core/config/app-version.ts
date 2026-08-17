/**
 * Versions shipped by the current repository state.
 *
 * Platform truth for release numbering lives outside this file:
 * - Android native: Google Play Production
 * - iOS native: App Store Connect READY_FOR_SALE
 * - OTA content: R2 manifest
 *
 * These constants are working-tree mirrors only and are corrected during release planning.
 */
export const CURRENT_ANDROID_NATIVE_VERSION = "0.2.3";
export const CURRENT_IOS_NATIVE_VERSION = "0.2.6";
/** @deprecated Use CURRENT_ANDROID_NATIVE_VERSION for Android-specific paths. */
export const CURRENT_NATIVE_APP_VERSION = CURRENT_ANDROID_NATIVE_VERSION;
export const CURRENT_WEB_CONTENT_VERSION = "0.2.3.0";
