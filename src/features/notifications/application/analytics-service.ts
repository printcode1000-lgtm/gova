"use client";

import type { NotificationAnalyticsEvent } from "@asol/notifications-core";
import type { NotificationLifecycleEvent } from "@asol/notifications-core";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { createNotificationId } from "@asol/notifications-core";

export class AnalyticsService {
  async track(input: {
    uid: string;
    notificationId: string;
    event: NotificationLifecycleEvent;
    metadata?: NotificationAnalyticsEvent["metadata"];
  }): Promise<void> {
    await asolNotificationRepository.addAnalyticsEvent({
      id: createNotificationId("nta"),
      uid: input.uid,
      notificationId: input.notificationId,
      event: input.event,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    });
  }
}

export const notificationAnalyticsService = new AnalyticsService();
