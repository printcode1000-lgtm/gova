/**
 * The human-readable label stored with a native push registration.
 *
 * It is persisted on the device-token record and may reach device-management
 * surfaces, so it carries the public product name, never a historical one.
 */
export function nativeDeviceLabel(platform: "android" | "ios"): string {
  return platform === "android" ? "Pbook Android" : "Pbook iOS";
}
