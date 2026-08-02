"use client";

import { NotificationTargets } from "../domain/enums";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { capacitorBadgeService } from "../infrastructure/capacitor/capacitor-badge.service";

export class BadgeService {
  async refresh(uid: string): Promise<number> {
    const notifications = await asolNotificationRepository.list(uid);
    const unreadCount = notifications.filter(
      (item) => !item.readAt && item.targets.includes(NotificationTargets.Badge),
    ).length;
    await asolNotificationRepository.saveBadge({
      uid,
      unreadCount,
      updatedAt: new Date().toISOString(),
    });
    if (unreadCount > 0) await capacitorBadgeService.set(unreadCount);
    else await capacitorBadgeService.clear();
    return unreadCount;
  }

  async get(uid: string): Promise<number> {
    return (await asolNotificationRepository.getBadge(uid))?.unreadCount ?? 0;
  }
}

export const notificationBadgeService = new BadgeService();
