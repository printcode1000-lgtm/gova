"use client";

import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";

export class NotificationSyncService {
  async sync(uid: string): Promise<void> {
    const queue = await asolNotificationRepository.listOfflineQueue(uid);
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (queue.length > 0) await asolNotificationRepository.saveOfflineQueue(uid, []);
  }
}

export const notificationSyncService = new NotificationSyncService();
