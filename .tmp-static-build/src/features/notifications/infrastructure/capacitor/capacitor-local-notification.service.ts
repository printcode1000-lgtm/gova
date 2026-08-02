"use client";

import { localNotifications } from "@/native-platform/notifications";
import type { NotificationEntity } from "../../domain/entities";

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
 */
export class CapacitorLocalNotificationService {
  async display(notification: NotificationEntity): Promise<void> {
    await localNotifications.schedule({
      id: numericId(notification.dedupeKey || notification.id),
      title: notification.title,
      body: notification.body,
      // Omitting `at` delivers immediately.
    });
  }
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
