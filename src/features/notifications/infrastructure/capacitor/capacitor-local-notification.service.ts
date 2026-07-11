"use client";

import type { NotificationEntity } from "../../domain/entities";

export class CapacitorLocalNotificationService {
  async display(notification: NotificationEntity): Promise<void> {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification(notification.title, {
      body: notification.body,
      tag: notification.dedupeKey,
    });
  }
}

export const capacitorLocalNotificationService = new CapacitorLocalNotificationService();
