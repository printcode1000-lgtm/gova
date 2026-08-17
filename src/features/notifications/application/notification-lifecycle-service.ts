"use client";

import { NotificationLifecycleEvents } from "@asol/notifications-core";
import { NOTIFICATION_CHANGED_EVENT } from "@asol/notifications-core";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { notificationAnalyticsService } from "./analytics-service";
import { notificationBadgeService } from "./badge-service";

function emitNotificationChanged(uid: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_CHANGED_EVENT, {
      detail: { uid },
    }),
  );
}

export class NotificationLifecycleService {
  async markRead(uid: string, notificationId: string): Promise<void> {
    const now = new Date().toISOString();
    await asolNotificationRepository.update(uid, notificationId, { readAt: now, openedAt: now });
    await notificationAnalyticsService.track({
      uid,
      notificationId,
      event: NotificationLifecycleEvents.Opened,
    });
    await notificationBadgeService.refresh(uid);
    emitNotificationChanged(uid);
  }

  async markAllRead(uid: string): Promise<void> {
    await asolNotificationRepository.markAllRead(uid);
    await notificationBadgeService.refresh(uid);
    emitNotificationChanged(uid);
  }

  async markManyRead(uid: string, notificationIds: readonly string[]): Promise<void> {
    const ids = [...new Set(notificationIds)];
    if (ids.length === 0) return;
    await asolNotificationRepository.markManyRead(uid, ids);
    await Promise.all(
      ids.map((notificationId) =>
        notificationAnalyticsService.track({
          uid,
          notificationId,
          event: NotificationLifecycleEvents.Opened,
        }),
      ),
    );
    await notificationBadgeService.refresh(uid);
    emitNotificationChanged(uid);
  }

  async dismiss(uid: string, notificationId: string): Promise<void> {
    await asolNotificationRepository.update(uid, notificationId, {
      dismissedAt: new Date().toISOString(),
    });
    await notificationAnalyticsService.track({
      uid,
      notificationId,
      event: NotificationLifecycleEvents.Dismissed,
    });
    await asolNotificationRepository.delete(uid, notificationId);
    await notificationBadgeService.refresh(uid);
    emitNotificationChanged(uid);
  }
}

export const notificationLifecycleService = new NotificationLifecycleService();
