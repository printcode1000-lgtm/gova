"use client";

import type { NotificationEntity } from "../domain/entities";
import { NOTIFICATION_CHANGED_EVENT } from "../domain/defaults";
import { NotificationLifecycleEvents } from "../domain/enums";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { notificationAnalyticsService } from "./analytics-service";
import { notificationBadgeService } from "./badge-service";

export class NotificationReceiver {
  async receiveForeground(
    notification: NotificationEntity,
  ): Promise<NotificationEntity> {
    const saved = await asolNotificationRepository.save(notification);
    await notificationAnalyticsService.track({
      uid: saved.uid,
      notificationId: saved.id,
      event: NotificationLifecycleEvents.Received,
    });
    await notificationAnalyticsService.track({
      uid: saved.uid,
      notificationId: saved.id,
      event: NotificationLifecycleEvents.Displayed,
    });
    await notificationBadgeService.refresh(saved.uid);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(NOTIFICATION_CHANGED_EVENT, {
          detail: { uid: saved.uid },
        }),
      );
    }
    return saved;
  }

  async importNativeNotifications(): Promise<void> {
    return;
  }
}

export const notificationReceiver = new NotificationReceiver();
