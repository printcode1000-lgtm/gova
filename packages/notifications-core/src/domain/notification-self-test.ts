import type { NotificationLocale } from "./entities";
import {
  NotificationCategories,
  NotificationPriorities,
  NotificationSounds,
} from "./enums";
import { NotificationChannelIds } from "./notification-sound";

/**
 * The push an account sends to its own devices to prove delivery works.
 *
 * The content is defined here rather than accepted from the caller: the send is
 * reachable by any signed-in user, so nothing about it may be attacker-chosen.
 * The only input is the locale, and that only picks between the two strings
 * below.
 */
export const SELF_TEST_NOTIFICATION_SOURCE = "account_notification_self_test";

export const SELF_TEST_NOTIFICATION_DELIVERY = Object.freeze({
  category: NotificationCategories.System,
  priority: NotificationPriorities.Normal,
  sound: NotificationSounds.Default,
  channelId: NotificationChannelIds.General,
  routeHref: "/settings/notifications",
} as const);

export interface SelfTestNotificationContent {
  title: string;
  body: string;
}

const CONTENT: Readonly<
  Record<NotificationLocale, SelfTestNotificationContent>
> = Object.freeze({
  ar: {
    title: "إشعار تجريبي",
    body: "وصلك هذا الإشعار، إذًا الإشعارات تعمل على هذا الجهاز.",
  },
  en: {
    title: "Test notification",
    body: "This arrived, so notifications are working on this device.",
  },
});

export function selfTestNotificationContent(
  locale: NotificationLocale | string | undefined,
): SelfTestNotificationContent {
  return locale === "en" ? CONTENT.en : CONTENT.ar;
}
