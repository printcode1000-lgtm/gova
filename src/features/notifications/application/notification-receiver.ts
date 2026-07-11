"use client";

import type { NotificationEntity } from "../domain/entities";
import { notificationSender } from "./notification-sender";

export class NotificationReceiver {
  async receiveForeground(notification: NotificationEntity): Promise<NotificationEntity> {
    return notificationSender.send(notification);
  }

  async importNativeNotifications(): Promise<void> {
    return;
  }
}

export const notificationReceiver = new NotificationReceiver();
