"use client";

import {
  ASOL_DB_STORES,
  asolDbDelete,
  asolDbGet,
  asolDbSet,
} from "@/lib/asol-db";
import type {
  DeviceToken,
  NotificationAnalyticsEvent,
  NotificationBadgeState,
  NotificationEntity,
  NotificationOfflineOperation,
  NotificationSettings,
} from "../domain/entities";

const listKey = (uid: string) => `user:${uid}:list`;
const settingsKey = (uid: string) => `user:${uid}`;
const badgeKey = (uid: string) => `user:${uid}`;
const tokenListKey = (uid: string) => `user:${uid}:tokens`;
const analyticsListKey = (uid: string) => `user:${uid}:analytics`;
const offlineQueueKey = (uid: string) => `user:${uid}:queue`;
const dismissedKey = (uid: string) => `user:${uid}:dismissed`;

export class AsolNotificationRepository {
  async list(uid: string): Promise<NotificationEntity[]> {
    return (await asolDbGet<NotificationEntity[]>(
      ASOL_DB_STORES.NOTIFICATIONS,
      listKey(uid),
    )) ?? [];
  }

  async save(notification: NotificationEntity): Promise<NotificationEntity> {
    const dismissed = await this.listDismissed(notification.uid);
    if (
      dismissed.some(
        (item) =>
          item === notification.dedupeKey ||
          item === notification.id,
      )
    ) {
      return notification;
    }
    const current = await this.list(notification.uid);
    if (current.some((item) => item.dedupeKey === notification.dedupeKey)) {
      return current.find((item) => item.dedupeKey === notification.dedupeKey) ?? notification;
    }
    const next = [notification, ...current].slice(0, 250);
    await asolDbSet(ASOL_DB_STORES.NOTIFICATIONS, listKey(notification.uid), next);
    return notification;
  }

  async update(uid: string, notificationId: string, patch: Partial<NotificationEntity>) {
    const current = await this.list(uid);
    const next = current.map((item) =>
      item.id === notificationId
        ? { ...item, ...patch, updatedAt: new Date().toISOString() }
        : item,
    );
    await asolDbSet(ASOL_DB_STORES.NOTIFICATIONS, listKey(uid), next);
  }

  async markAllRead(uid: string): Promise<void> {
    const now = new Date().toISOString();
    const current = await this.list(uid);
    await asolDbSet(
      ASOL_DB_STORES.NOTIFICATIONS,
      listKey(uid),
      current.map((item) => ({ ...item, readAt: item.readAt ?? now, updatedAt: now })),
    );
  }

  async delete(uid: string, notificationId: string): Promise<void> {
    const current = await this.list(uid);
    const deleted = current.find((item) => item.id === notificationId);
    await asolDbSet(
      ASOL_DB_STORES.NOTIFICATIONS,
      listKey(uid),
      current.filter((item) => item.id !== notificationId),
    );
    if (deleted) await this.rememberDismissed(deleted);
  }

  async clear(uid: string): Promise<void> {
    const current = await this.list(uid);
    await this.rememberDismissedMany(current);
    await asolDbDelete(ASOL_DB_STORES.NOTIFICATIONS, listKey(uid));
  }

  async listDismissed(uid: string): Promise<string[]> {
    return (await asolDbGet<string[]>(
      ASOL_DB_STORES.NOTIFICATION_SETTINGS,
      dismissedKey(uid),
    )) ?? [];
  }

  async rememberDismissed(notification: NotificationEntity): Promise<void> {
    await this.rememberDismissedMany([notification]);
  }

  async rememberDismissedMany(notifications: NotificationEntity[]): Promise<void> {
    const uid = notifications[0]?.uid;
    if (!uid) return;
    const current = await this.listDismissed(uid);
    const next = new Set(current);
    for (const notification of notifications) {
      if (notification.id) next.add(notification.id);
      if (notification.dedupeKey) next.add(notification.dedupeKey);
    }
    await asolDbSet(
      ASOL_DB_STORES.NOTIFICATION_SETTINGS,
      dismissedKey(uid),
      Array.from(next).slice(-500),
    );
  }

  async getSettings(uid: string): Promise<NotificationSettings | null> {
    return asolDbGet<NotificationSettings>(
      ASOL_DB_STORES.NOTIFICATION_SETTINGS,
      settingsKey(uid),
    );
  }

  async saveSettings(settings: NotificationSettings): Promise<void> {
    await asolDbSet(ASOL_DB_STORES.NOTIFICATION_SETTINGS, settingsKey(settings.uid), settings);
  }

  async getBadge(uid: string): Promise<NotificationBadgeState | null> {
    return asolDbGet<NotificationBadgeState>(
      ASOL_DB_STORES.NOTIFICATION_BADGES,
      badgeKey(uid),
    );
  }

  async saveBadge(state: NotificationBadgeState): Promise<void> {
    await asolDbSet(ASOL_DB_STORES.NOTIFICATION_BADGES, badgeKey(state.uid), state);
  }

  async listDeviceTokens(uid: string): Promise<DeviceToken[]> {
    return (await asolDbGet<DeviceToken[]>(
      ASOL_DB_STORES.NOTIFICATION_DEVICE_TOKENS,
      tokenListKey(uid),
    )) ?? [];
  }

  async saveDeviceToken(token: DeviceToken): Promise<void> {
    const current = await this.listDeviceTokens(token.uid);
    const next = [token, ...current.filter((item) => item.id !== token.id)];
    await asolDbSet(ASOL_DB_STORES.NOTIFICATION_DEVICE_TOKENS, tokenListKey(token.uid), next);
  }

  async removeDeviceToken(uid: string, tokenId: string): Promise<void> {
    const current = await this.listDeviceTokens(uid);
    await asolDbSet(
      ASOL_DB_STORES.NOTIFICATION_DEVICE_TOKENS,
      tokenListKey(uid),
      current.filter((item) => item.id !== tokenId),
    );
  }

  async addAnalyticsEvent(event: NotificationAnalyticsEvent): Promise<void> {
    const current =
      (await asolDbGet<NotificationAnalyticsEvent[]>(
        ASOL_DB_STORES.NOTIFICATION_ANALYTICS,
        analyticsListKey(event.uid),
      )) ?? [];
    await asolDbSet(
      ASOL_DB_STORES.NOTIFICATION_ANALYTICS,
      analyticsListKey(event.uid),
      [event, ...current].slice(0, 500),
    );
  }

  async listOfflineQueue(uid: string): Promise<NotificationOfflineOperation[]> {
    return (await asolDbGet<NotificationOfflineOperation[]>(
      ASOL_DB_STORES.NOTIFICATION_OFFLINE_QUEUE,
      offlineQueueKey(uid),
    )) ?? [];
  }

  async saveOfflineQueue(uid: string, queue: NotificationOfflineOperation[]): Promise<void> {
    await asolDbSet(ASOL_DB_STORES.NOTIFICATION_OFFLINE_QUEUE, offlineQueueKey(uid), queue);
  }
}

export const asolNotificationRepository = new AsolNotificationRepository();
