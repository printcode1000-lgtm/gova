"use client";

import {
  NOTIFICATION_CHANGED_EVENT,
  NOTIFICATION_POPUP_EVENT,
} from "../domain/defaults";
import type { NotificationEntity } from "../domain/entities";
import {
  NotificationDeliveryStatuses,
  NotificationLifecycleEvents,
  NotificationSyncStates,
  NotificationTargets,
} from "../domain/enums";
import { capacitorLocalNotificationService } from "../infrastructure/capacitor/capacitor-local-notification.service";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { notificationAnalyticsService } from "./analytics-service";
import { notificationBadgeService } from "./badge-service";
import { notificationRouter } from "./notification-router";

function emitChanged(uid: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_CHANGED_EVENT, { detail: { uid } }));
}

export class NotificationSender {
  async send(notification: NotificationEntity): Promise<NotificationEntity> {
    const routed: NotificationEntity = {
      ...notification,
      channels: notificationRouter.resolveChannels(notification.channels, notification.priority),
      targets: notificationRouter.resolveTargets(notification.targets, notification.priority),
      status: NotificationDeliveryStatuses.Delivered,
      syncState: NotificationSyncStates.Synced,
      displayedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const saved = await asolNotificationRepository.save(routed);
    await notificationAnalyticsService.track({
      uid: saved.uid,
      notificationId: saved.id,
      event: NotificationLifecycleEvents.Sent,
    });
    await notificationAnalyticsService.track({
      uid: saved.uid,
      notificationId: saved.id,
      event: NotificationLifecycleEvents.Displayed,
    });
    await notificationBadgeService.refresh(saved.uid);
    if (saved.targets.includes(NotificationTargets.Popup)) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(NOTIFICATION_POPUP_EVENT, { detail: saved }));
      }
      await capacitorLocalNotificationService.display(saved);
    }
    emitChanged(saved.uid);
    return saved;
  }
}

export const notificationSender = new NotificationSender();
