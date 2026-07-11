"use client";

import { NotificationLifecycleEvents } from "../domain/enums";
import { govaNotificationRepository } from "../infrastructure/gova-notification-repository";
import { notificationAnalyticsService } from "./analytics-service";
import { notificationBadgeService } from "./badge-service";

export class NotificationLifecycleService {
  async markRead(uid: string, notificationId: string): Promise<void> {
    const now = new Date().toISOString();
    await govaNotificationRepository.update(uid, notificationId, { readAt: now, openedAt: now });
    await notificationAnalyticsService.track({
      uid,
      notificationId,
      event: NotificationLifecycleEvents.Opened,
    });
    await notificationBadgeService.refresh(uid);
  }

  async markAllRead(uid: string): Promise<void> {
    await govaNotificationRepository.markAllRead(uid);
    await notificationBadgeService.refresh(uid);
  }

  async dismiss(uid: string, notificationId: string): Promise<void> {
    await govaNotificationRepository.update(uid, notificationId, {
      dismissedAt: new Date().toISOString(),
    });
    await notificationAnalyticsService.track({
      uid,
      notificationId,
      event: NotificationLifecycleEvents.Dismissed,
    });
    await govaNotificationRepository.delete(uid, notificationId);
    await notificationBadgeService.refresh(uid);
  }
}

export const notificationLifecycleService = new NotificationLifecycleService();
