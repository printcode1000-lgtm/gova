/**
 * Push token classification.
 *
 * Single responsibility: decide which server transport a device token belongs
 * to, from the token itself rather than from the platform name.
 *
 * Why this exists: on Apple, `@capacitor/push-notifications` returns a **raw
 * APNs device token** unless the Firebase Messaging iOS SDK is installed and
 * configured, in which case it returns an **FCM registration token**. The two
 * are not interchangeable — sending an APNs token to Firebase Cloud Messaging
 * fails with INVALID_ARGUMENT and would get the device de-registered.
 *
 * Classifying by shape means the application routes correctly both before and
 * after the Firebase iOS SDK is added, with no code change and no migration.
 */

export const PushTokenKinds = {
  /** Firebase registration token — deliverable through Firebase Admin. */
  Fcm: "fcm",
  /** Raw Apple device token — requires a direct APNs connection. */
  Apns: "apns",
} as const;

export type PushTokenKind =
  (typeof PushTokenKinds)[keyof typeof PushTokenKinds];

/** A raw APNs device token is 64 hexadecimal characters (32 bytes). */
const APNS_DEVICE_TOKEN = /^[0-9a-f]{64}$/i;

/**
 * Classify a device token.
 *
 * An FCM registration token is long, mixed-case, and contains characters
 * outside the hexadecimal alphabet (`:`, `_`, `-`). Anything that is exactly
 * 64 hex characters is an Apple device token.
 */
export function classifyPushToken(token: string): PushTokenKind {
  const value = token.trim();
  return APNS_DEVICE_TOKEN.test(value) ? PushTokenKinds.Apns : PushTokenKinds.Fcm;
}

/**
 * Resolve the provider key to persist with a device token.
 *
 * Android always yields an FCM token. Apple yields an FCM token once the
 * Firebase iOS SDK is present, and a raw APNs token until then.
 */
export function resolvePushProvider(
  platform: "android" | "ios",
  token: string,
): PushTokenKind {
  if (platform === "android") return PushTokenKinds.Fcm;
  return classifyPushToken(token);
}
