"use client";

import {
  NOTIFICATION_CHANGED_EVENT,
  NOTIFICATION_POPUP_EVENT,
} from "@asol/notifications-core";
import type { NotificationEntity } from "@asol/notifications-core";
import {
  NotificationDeliveryStatuses,
  NotificationLifecycleEvents,
  NotificationSyncStates,
  NotificationTargets,
} from "@asol/notifications-core";
import { assertNotificationEntity } from "../domain/notification-validation";
import { notificationLog } from "../domain/notification-redaction";
import { nativeLocalNotificationService } from "../infrastructure/native/native-local-notification.service";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { runNotificationStoredExtensions } from "./notification-stored-extension";
import { notificationAnalyticsService } from "./analytics-service";
import { notificationBadgeService } from "./badge-service";
import { notificationRouter } from "./notification-router";

function emitChanged(uid: string, notificationId?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_CHANGED_EVENT, {
      detail: { uid, notificationId },
    }),
  );
}

export class NotificationSender {
  async send(notification: unknown): Promise<NotificationEntity> {
    const validated = assertNotificationEntity(notification);
    const now = new Date().toISOString();
    const routed: NotificationEntity = {
      ...validated,
      channels: notificationRouter.resolveChannels(validated.channels, validated.priority),
      targets: notificationRouter.resolveTargets(validated.targets, validated.priority),
      status: NotificationDeliveryStatuses.Delivered,
      syncState: NotificationSyncStates.Synced,
      displayedAt: now,
      updatedAt: now,
    };

    const outcome = await asolNotificationRepository.save(routed);
    if (!outcome.stored) return outcome.notification;

    const saved = outcome.notification;
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
    await runNotificationStoredExtensions(saved);

    if (saved.targets.includes(NotificationTargets.Popup)) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(NOTIFICATION_POPUP_EVENT, { detail: saved }));
      }
      try {
        await nativeLocalNotificationService.display(saved);
      } catch (error) {
        notificationLog.warn("Local presentation failed.", error);
      }
    }
    emitChanged(saved.uid, saved.id);
    return saved;
  }
}

export const notificationSender = new NotificationSender();
