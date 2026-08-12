"use client";

import type { NotificationEntity } from "../domain/entities";
import { NOTIFICATION_CHANGED_EVENT } from "../domain/defaults";
import { NotificationLifecycleEvents } from "../domain/enums";
import { sanitizeNotificationEntity } from "../domain/notification-validation";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { notificationAnalyticsService } from "./analytics-service";
import { notificationBadgeService } from "./badge-service";

/**
 * What happened to an inbound notification.
 *
 * `stored` is the acknowledgement signal. A caller that must tell a source the
 * notification was handled — the Android tray importer removing a delivered
 * item, an extension acknowledging a receipt — may only do so when persistence
 * actually succeeded, so a crash between the two leaves the item to be
 * re-imported rather than silently lost.
 */
export interface NotificationReceiveResult {
  notification: NotificationEntity;
  /** True only when this call added a new row. */
  stored: boolean;
  /** Present when it did not: why. */
  reason?: "duplicate" | "dismissed" | "placeholder" | "invalid";
}

function emitChanged(uid: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_CHANGED_EVENT, { detail: { uid } }));
}

export class NotificationReceiver {
  /**
   * Take one inbound notification into the centre.
   *
   * Analytics and the change event fire only for a notification that was
   * actually stored: a duplicate delivery of the same push is not a second
   * "received" event, and firing the change event for it would make the centre
   * reload on every redelivery.
   */
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
    emitChanged(outcome.notification.uid);
    return { notification: outcome.notification, stored: true };
  }

  /**
   * Take a batch — a tray import — under one storage lock.
   *
   * Returns only what was newly stored, which is what the importer acknowledges.
   */
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
