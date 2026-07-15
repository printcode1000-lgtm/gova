"use client";

import { NotificationLifecycleEvents } from "../domain/enums";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { notificationAnalyticsService } from "./analytics-service";
import { notificationBadgeService } from "./badge-service";

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
  }

  async markAllRead(uid: string): Promise<void> {
    await asolNotificationRepository.markAllRead(uid);
    await notificationBadgeService.refresh(uid);
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
  }
}

export const notificationLifecycleService = new NotificationLifecycleService();
