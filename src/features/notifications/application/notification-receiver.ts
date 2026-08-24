"use client";

import type { NotificationEntity } from "@asol/notifications-core";
import { NOTIFICATION_CHANGED_EVENT } from "@asol/notifications-core";
import { NotificationLifecycleEvents } from "@asol/notifications-core";
import { sanitizeNotificationEntity } from "../domain/notification-validation";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { runNotificationStoredExtensions } from "../public/notification-stored-extension";
import { notificationAnalyticsService } from "./analytics-service";
import { notificationBadgeService } from "./badge-service";

export interface NotificationReceiveResult {
  notification: NotificationEntity;
  stored: boolean;
  reason?: "duplicate" | "dismissed" | "placeholder" | "invalid";
}

function emitChanged(uid: string, notificationId?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_CHANGED_EVENT, {
      detail: { uid, notificationId },
    }),
  );
}

export class NotificationReceiver {
  async receiveForeground(notification: unknown): Promise<NotificationReceiveResult> {
    const sanitized = sanitizeNotificationEntity(notification);
    if (!sanitized) {
      return {
        notification: notification as NotificationEntity,
        stored: false,
        reason: "invalid",
      };
    }

    const outcome = await asolNotificationRepository.save(sanitized);
    if (!outcome.stored) {
      return { notification: outcome.notification, stored: false, reason: outcome.reason };
    }

    await notificationAnalyticsService.track({
      uid: outcome.notification.uid,
      notificationId: outcome.notification.id,
      event: NotificationLifecycleEvents.Received,
    });
    await notificationAnalyticsService.track({
      uid: outcome.notification.uid,
      notificationId: outcome.notification.id,
      event: NotificationLifecycleEvents.Displayed,
    });
    await notificationBadgeService.refresh(outcome.notification.uid);
    await runNotificationStoredExtensions(outcome.notification);
    emitChanged(outcome.notification.uid, outcome.notification.id);
    return { notification: outcome.notification, stored: true };
  }

  async receiveBatch(
    uid: string,
    notifications: readonly unknown[],
  ): Promise<NotificationReceiveResult[]> {
    if (!uid || notifications.length === 0) return [];
    const candidates = notifications
      .map((record) => sanitizeNotificationEntity(record))
      .filter((record): record is NotificationEntity => record !== null && record.uid === uid);
    if (candidates.length === 0) return [];

    const { stored } = await asolNotificationRepository.saveMany(uid, candidates);
    for (const notification of stored) {
      await notificationAnalyticsService.track({
        uid,
        notificationId: notification.id,
        event: NotificationLifecycleEvents.Received,
      });
      await notificationAnalyticsService.track({
        uid,
        notificationId: notification.id,
        event: NotificationLifecycleEvents.Displayed,
      });
      await runNotificationStoredExtensions(notification);
    }
    if (stored.length > 0) {
      await notificationBadgeService.refresh(uid);
      emitChanged(uid);
    }
    const storedIds = new Set(stored.map((item) => item.id));
    return candidates.map((notification) => ({
      notification,
      stored: storedIds.has(notification.id),
      ...(storedIds.has(notification.id) ? {} : { reason: "duplicate" as const }),
    }));
  }
}

export const notificationReceiver = new NotificationReceiver();
