"use client";

import {
  GOVA_DB_STORES,
  govaDbDelete,
  govaDbGet,
  govaDbSet,
} from "@/lib/gova-db";
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

export class GovaNotificationRepository {
  async list(uid: string): Promise<NotificationEntity[]> {
    return (await govaDbGet<NotificationEntity[]>(
      GOVA_DB_STORES.NOTIFICATIONS,
      listKey(uid),
    )) ?? [];
  }

  async save(notification: NotificationEntity): Promise<NotificationEntity> {
    const current = await this.list(notification.uid);
    if (current.some((item) => item.dedupeKey === notification.dedupeKey)) {
      return current.find((item) => item.dedupeKey === notification.dedupeKey) ?? notification;
    }
    const next = [notification, ...current].slice(0, 250);
    await govaDbSet(GOVA_DB_STORES.NOTIFICATIONS, listKey(notification.uid), next);
    return notification;
  }

  async update(uid: string, notificationId: string, patch: Partial<NotificationEntity>) {
    const current = await this.list(uid);
    const next = current.map((item) =>
      item.id === notificationId
        ? { ...item, ...patch, updatedAt: new Date().toISOString() }
        : item,
    );
    await govaDbSet(GOVA_DB_STORES.NOTIFICATIONS, listKey(uid), next);
  }

  async markAllRead(uid: string): Promise<void> {
    const now = new Date().toISOString();
    const current = await this.list(uid);
    await govaDbSet(
      GOVA_DB_STORES.NOTIFICATIONS,
      listKey(uid),
      current.map((item) => ({ ...item, readAt: item.readAt ?? now, updatedAt: now })),
    );
  }

  async delete(uid: string, notificationId: string): Promise<void> {
    const current = await this.list(uid);
    await govaDbSet(
      GOVA_DB_STORES.NOTIFICATIONS,
      listKey(uid),
      current.filter((item) => item.id !== notificationId),
    );
  }

  async clear(uid: string): Promise<void> {
    await govaDbDelete(GOVA_DB_STORES.NOTIFICATIONS, listKey(uid));
  }

  async getSettings(uid: string): Promise<NotificationSettings | null> {
    return govaDbGet<NotificationSettings>(
      GOVA_DB_STORES.NOTIFICATION_SETTINGS,
      settingsKey(uid),
    );
  }

  async saveSettings(settings: NotificationSettings): Promise<void> {
    await govaDbSet(GOVA_DB_STORES.NOTIFICATION_SETTINGS, settingsKey(settings.uid), settings);
  }

  async getBadge(uid: string): Promise<NotificationBadgeState | null> {
    return govaDbGet<NotificationBadgeState>(
      GOVA_DB_STORES.NOTIFICATION_BADGES,
      badgeKey(uid),
    );
  }

  async saveBadge(state: NotificationBadgeState): Promise<void> {
    await govaDbSet(GOVA_DB_STORES.NOTIFICATION_BADGES, badgeKey(state.uid), state);
  }

  async listDeviceTokens(uid: string): Promise<DeviceToken[]> {
    return (await govaDbGet<DeviceToken[]>(
      GOVA_DB_STORES.NOTIFICATION_DEVICE_TOKENS,
      tokenListKey(uid),
    )) ?? [];
  }

  async saveDeviceToken(token: DeviceToken): Promise<void> {
    const current = await this.listDeviceTokens(token.uid);
    const next = [token, ...current.filter((item) => item.id !== token.id)];
    await govaDbSet(GOVA_DB_STORES.NOTIFICATION_DEVICE_TOKENS, tokenListKey(token.uid), next);
  }

  async removeDeviceToken(uid: string, tokenId: string): Promise<void> {
    const current = await this.listDeviceTokens(uid);
    await govaDbSet(
      GOVA_DB_STORES.NOTIFICATION_DEVICE_TOKENS,
      tokenListKey(uid),
      current.filter((item) => item.id !== tokenId),
    );
  }

  async addAnalyticsEvent(event: NotificationAnalyticsEvent): Promise<void> {
    const current =
      (await govaDbGet<NotificationAnalyticsEvent[]>(
        GOVA_DB_STORES.NOTIFICATION_ANALYTICS,
        analyticsListKey(event.uid),
      )) ?? [];
    await govaDbSet(
      GOVA_DB_STORES.NOTIFICATION_ANALYTICS,
      analyticsListKey(event.uid),
      [event, ...current].slice(0, 500),
    );
  }

  async listOfflineQueue(uid: string): Promise<NotificationOfflineOperation[]> {
    return (await govaDbGet<NotificationOfflineOperation[]>(
      GOVA_DB_STORES.NOTIFICATION_OFFLINE_QUEUE,
      offlineQueueKey(uid),
    )) ?? [];
  }

  async saveOfflineQueue(uid: string, queue: NotificationOfflineOperation[]): Promise<void> {
    await govaDbSet(GOVA_DB_STORES.NOTIFICATION_OFFLINE_QUEUE, offlineQueueKey(uid), queue);
  }
}

export const govaNotificationRepository = new GovaNotificationRepository();
