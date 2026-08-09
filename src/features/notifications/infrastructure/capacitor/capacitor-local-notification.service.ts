"use client";

import { localNotifications } from "@/native-platform/notifications";
import type { NotificationEntity } from "../../domain/entities";
import {
  localNotificationSoundFile,
  resolveAndroidChannelId,
} from "../../domain/notification-sound";
import { capacitorPlatformService } from "./capacitor-platform.service";

/**
 * Immediate on-device display of a notification the application produced.
 *
 * Delegates to the Native Platform Local Notifications module, so the same
 * code path serves the browser, Android, and iOS. It must not call
 * `new Notification(...)` or a Capacitor plugin directly.
 *
 * The permission is never requested here. `schedule()` checks it on every
 * platform and exits quietly when it is absent, so a missing permission
 * degrades to "no notification" rather than an error or a surprise prompt.
 *
 * Sound and channel are always passed explicitly. Left out, iOS produces a
 * silent notification (`content.sound` stays nil) and Android falls back to
 * the general channel, so an order or a chat message would be announced under
 * the wrong entry in the user's system settings.
 */
export class CapacitorLocalNotificationService {
  async display(notification: NotificationEntity): Promise<void> {
    const platform = capacitorPlatformService.getPlatform();
    await localNotifications.schedule({
      id: numericId(notification.dedupeKey || notification.id),
      title: notification.title,
      body: notification.body,
      channelId: resolveAndroidChannelId({
        category: notification.category,
        priority: notification.priority,
        sound: notification.sound,
        source: notification.metadata?.source,
      }),
      sound: localNotificationSoundFile(platform, notification.sound),
      data: toExtra(notification),
      // Omitting `at` delivers immediately.
    });
  }
}

/**
 * Data carried through the OS and handed back when the user taps.
 *
 * Deliberately the same flat, string-only shape a push payload uses, so the
 * tap handler can rebuild the entity with the same reader and a locally
 * displayed notification routes exactly like a remote one.
 */
function toExtra(notification: NotificationEntity): Record<string, string> {
  const extra: Record<string, string> = {
    notificationId: notification.id,
    dedupeKey: notification.dedupeKey,
    title: notification.title,
    body: notification.body,
    category: notification.category,
    priority: notification.priority,
    sound: notification.sound,
    createdAt: notification.createdAt,
  };
  if (notification.templateId) extra.templateId = notification.templateId;
  if (notification.route?.href) extra.routeHref = notification.route.href;
  if (notification.route?.label) extra.routeLabel = notification.route.label;
  if (notification.groupKey) extra.groupKey = notification.groupKey;
  for (const [key, value] of Object.entries(notification.metadata ?? {})) {
    if (value !== null && value !== undefined) extra[`meta_${key}`] = String(value);
  }
  return extra;
}

/**
 * Local notifications are addressed by a 32-bit integer, while ASOL
 * notifications carry a string key. A stable hash keeps the mapping
 * deterministic so the same notification cannot be scheduled twice.
 */
function numericId(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const capacitorLocalNotificationService =
  new CapacitorLocalNotificationService();
