/**
 * Which sound a notification carries, and which Android channel delivers it.
 *
 * On Android 8 and newer the sound is a property of the *channel*, not of the
 * notification, so "which sound" and "which channel" are one question. Three
 * independent senders have to answer it identically — the FCM provider, the
 * direct APNs provider, and the on-device local notification — so the answer
 * lives here rather than being restated in each of them.
 *
 * Domain-only: no platform, server, or Capacitor imports, because the server
 * providers and the browser bundle both depend on it.
 */

import {
  NotificationCategories,
  NotificationPriorities,
  NotificationSounds,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationSound,
} from "./enums";

/**
 * Bundled at `android/app/src/main/res/raw/` by `sync-android-push-assets.ts`.
 * Used by local notifications, which accept a file name.
 */
export const ANDROID_SOUND_FILE = "custom_notification.mp3";

/** Bundled in the Xcode App target resources. iOS wants the extension. */
export const APPLE_SOUND_FILE = "custom_notification.caf";

/**
 * FCM and the Android channel API resolve a raw resource by *base* name.
 * Sending the extension makes the lookup fail and Android silently falls back
 * to the system sound, so the extensionless form is a separate constant rather
 * than something each caller trims.
 */
export const FCM_SOUND_RESOURCE = "custom_notification";

/**
 * Android channel ids.
 *
 * Versioned (`_v4`) because Android refuses to change the sound of a channel
 * that already exists on a device: a new sound needs a new id. The ids and the
 * channels registered in `src/native-platform/notifications/types.ts` are
 * verified against each other by `notification-sound-contract.test.ts`.
 */
export const NotificationChannelIds = {
  General: "asol_general_v4",
  Orders: "asol_orders_v4",
  Chat: "asol_chat_v4",
  Urgent: "asol_urgent_v4",
  Updates: "asol_updates_v4",
  Silent: "asol_silent_v4",
} as const;

export type NotificationChannelId =
  (typeof NotificationChannelIds)[keyof typeof NotificationChannelIds];

/** `metadata.source` marking a super-admin announcement. */
export const SUPER_ADMIN_BROADCAST_SOURCE = "super_admin_broadcast";

export interface NotificationSoundContext {
  category: NotificationCategory;
  priority: NotificationPriority;
  sound: NotificationSound;
  /** `metadata.source`; free-form, so it is compared as a string. */
  source?: unknown;
}

/** True when the notification must arrive without a sound. */
export function isSilentNotification(sound: NotificationSound): boolean {
  return sound === NotificationSounds.Silent;
}

/**
 * The channel that carries this notification.
 *
 * Order matters and is the contract:
 *
 * 1. `silent` wins over everything — a low-importance channel is the only way
 *    Android lets an application deliver without a sound.
 * 2. `critical` priority and the `urgent` sound share the urgent channel.
 *    There is one sound asset, so `urgent` cannot mean a different file; it
 *    means the channel that interrupts.
 * 3. Announcements get their own channel so a user can silence marketing from
 *    Android settings without silencing their orders.
 * 4. Then category.
 */
export function resolveAndroidChannelId(
  context: NotificationSoundContext,
): NotificationChannelId {
  if (isSilentNotification(context.sound)) return NotificationChannelIds.Silent;
  if (
    context.priority === NotificationPriorities.Critical ||
    context.sound === NotificationSounds.Urgent
  ) {
    return NotificationChannelIds.Urgent;
  }
  if (
    context.source !== undefined &&
    context.source !== null &&
    String(context.source) === SUPER_ADMIN_BROADCAST_SOURCE
  ) {
    return NotificationChannelIds.Updates;
  }
  if (context.category === NotificationCategories.Orders) {
    return NotificationChannelIds.Orders;
  }
  if (context.category === NotificationCategories.Chat) {
    return NotificationChannelIds.Chat;
  }
  return NotificationChannelIds.General;
}

/** Raw resource name for an FCM payload, or `undefined` when silent. */
export function fcmSoundResource(sound: NotificationSound): string | undefined {
  return isSilentNotification(sound) ? undefined : FCM_SOUND_RESOURCE;
}

/** `aps.sound` value, or `undefined` when silent. */
export function appleSoundFile(sound: NotificationSound): string | undefined {
  return isSilentNotification(sound) ? undefined : APPLE_SOUND_FILE;
}

/**
 * Sound file for an on-device local notification.
 *
 * The two platforms need different files, and passing the wrong one is a
 * silent failure on both, so the platform is required rather than defaulted.
 */
export function localNotificationSoundFile(
  platform: "android" | "ios" | "web",
  sound: NotificationSound,
): string | undefined {
  if (isSilentNotification(sound)) return undefined;
  if (platform === "android") return ANDROID_SOUND_FILE;
  if (platform === "ios") return APPLE_SOUND_FILE;
  // The browser Notification API has no sound option at all.
  return undefined;
}
