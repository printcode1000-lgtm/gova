"use client";

import type { NotificationAnalyticsEvent } from "../domain/entities";
import type { NotificationLifecycleEvent } from "../domain/enums";
import { govaNotificationRepository } from "../infrastructure/gova-notification-repository";
import { createNotificationId } from "../shared/create-notification-id";

export class AnalyticsService {
  async track(input: {
    uid: string;
    notificationId: string;
    event: NotificationLifecycleEvent;
    metadata?: NotificationAnalyticsEvent["metadata"];
  }): Promise<void> {
    await govaNotificationRepository.addAnalyticsEvent({
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
