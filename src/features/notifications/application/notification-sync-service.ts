"use client";

import { govaNotificationRepository } from "../infrastructure/gova-notification-repository";

export class NotificationSyncService {
  async sync(uid: string): Promise<void> {
    const queue = await govaNotificationRepository.listOfflineQueue(uid);
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (queue.length > 0) await govaNotificationRepository.saveOfflineQueue(uid, []);
  }
}

export const notificationSyncService = new NotificationSyncService();
