"use client";

import {
  ASOL_DB_STORES,
  asolDbDelete,
  asolDbGet,
  asolDbSet,
} from "@/modules/data-access/browser/asol-db";
import type {
  DeviceToken,
  NotificationAnalyticsEvent,
  NotificationBadgeState,
  NotificationEntity,
  NotificationOfflineOperation,
  NotificationSettings,
} from "../domain/entities";
import {
  sanitizeNotificationEntity,
  sanitizeRetryOperation,
} from "../domain/notification-validation";
import { KeyedMutex } from "../shared/keyed-mutex";

/**
 * The notification centre's storage.
 *
 * Two invariants this file exists to hold, both of which the previous
 * read-then-write version could not:
 *
 * 1. **No lost writes.** IndexedDB has no compare-and-swap, and every list
 *    operation here is read-modify-write. A push arriving while the tray import
 *    is running used to read the same list, and whichever wrote second erased
 *    the other's notification. Every mutation now runs inside a per-user lock.
 * 2. **Nothing unvalidated comes back out.** Records may have been written by an
 *    older version of the app or by the service worker, so they are sanitized on
 *    read; a record too broken to repair is dropped rather than rendered.
 *
 * Locks are per key, and the two key spaces are deliberately separate: the
 * dismissed-identity list is written from inside a notification-list mutation,
 * so sharing one lock would deadlock.
 */

const MAX_STORED_NOTIFICATIONS = 250;
const MAX_DISMISSED_IDENTITIES = 500;
const MAX_ANALYTICS_EVENTS = 500;

const listKey = (uid: string) => `user:${uid}:list`;
const settingsKey = (uid: string) => `user:${uid}`;
const badgeKey = (uid: string) => `user:${uid}`;
const tokenListKey = (uid: string) => `user:${uid}:tokens`;
const analyticsListKey = (uid: string) => `user:${uid}:analytics`;
const offlineQueueKey = (uid: string) => `user:${uid}:queue`;
const dismissedKey = (uid: string) => `user:${uid}:dismissed`;

const listLock = (uid: string) => `notifications:${uid}`;
const dismissedLock = (uid: string) => `dismissed:${uid}`;
const tokensLock = (uid: string) => `tokens:${uid}`;
const queueLock = (uid: string) => `queue:${uid}`;
const analyticsLock = (uid: string) => `analytics:${uid}`;

/**
 * An `ASOL` card with no body, route, template, or event.
 *
 * Some Android system paths deliver one when a data-only push has no
 * displayable content. It carries nothing, so it is never stored, and its
 * identity is remembered so a later re-delivery is not stored either.
 */
function isEmptyPlaceholder(notification: NotificationEntity): boolean {
  return (
    notification.title.trim().toUpperCase() === "ASOL" &&
    !notification.body.trim() &&
    !notification.route?.href &&
    !notification.templateId &&
    !notification.eventName
  );
}

/** Why a save did not add a row. Callers use this to decide what to acknowledge. */
export type NotificationSaveOutcome =
  | { stored: true; notification: NotificationEntity }
  | {
      stored: false;
      notification: NotificationEntity;
      reason: "duplicate" | "dismissed" | "placeholder" | "invalid";
    };

export class AsolNotificationRepository {
  private readonly mutex = new KeyedMutex();

  // ---- notification list ---------------------------------------------------

  /**
   * Read and repair, without taking the lock.
   *
   * Callers that already hold the list lock use this; the public `list` wraps it
   * so an external reader still sees a consistent snapshot.
   */
  private async readList(uid: string): Promise<{
    items: NotificationEntity[];
    dropped: NotificationEntity[];
    changed: boolean;
  }> {
    const raw = (await asolDbGet<unknown[]>(ASOL_DB_STORES.NOTIFICATIONS, listKey(uid))) ?? [];
    const items: NotificationEntity[] = [];
    const dropped: NotificationEntity[] = [];
    let changed = false;

    for (const record of Array.isArray(raw) ? raw : []) {
      const sanitized = sanitizeNotificationEntity(record);
      if (!sanitized) {
        // Unrepairable: no identity, so it can never be shown or deduplicated.
        changed = true;
        continue;
      }
      if (sanitized.uid !== uid) {
        // A record filed under the wrong user is never returned to this one.
        changed = true;
        continue;
      }
      if (isEmptyPlaceholder(sanitized)) {
        dropped.push(sanitized);
        changed = true;
        continue;
      }
      items.push(sanitized);
    }
    return { items, dropped, changed };
  }

  private writeList(uid: string, items: NotificationEntity[]): Promise<void> {
    return asolDbSet(
      ASOL_DB_STORES.NOTIFICATIONS,
      listKey(uid),
      items.slice(0, MAX_STORED_NOTIFICATIONS),
    );
  }

  async list(uid: string): Promise<NotificationEntity[]> {
    if (!uid) return [];
    return this.mutex.run(listLock(uid), async () => {
      const { items, dropped, changed } = await this.readList(uid);
      if (changed) {
        await this.writeList(uid, items);
        if (dropped.length > 0) await this.rememberDismissedMany(dropped);
      }
      return items;
    });
  }

  /**
   * Store one notification if it is new.
   *
   * The whole check-then-write sequence is inside the lock, which is what makes
   * "exactly once" true rather than merely likely: two concurrent deliveries of
   * the same push both see the same list, and the second sees the first's row.
   */
  async save(notification: NotificationEntity): Promise<NotificationSaveOutcome> {
    const sanitized = sanitizeNotificationEntity(notification);
    if (!sanitized) {
      return { stored: false, notification, reason: "invalid" };
    }
    if (isEmptyPlaceholder(sanitized)) {
      await this.rememberDismissedMany([sanitized]);
      return { stored: false, notification: sanitized, reason: "placeholder" };
    }

    return this.mutex.run(listLock(sanitized.uid), async () => {
      const dismissed = new Set(await this.listDismissed(sanitized.uid));
      if (dismissed.has(sanitized.id) || dismissed.has(sanitized.dedupeKey)) {
        return { stored: false, notification: sanitized, reason: "dismissed" as const };
      }
      const { items } = await this.readList(sanitized.uid);
      const existing = items.find((item) => item.dedupeKey === sanitized.dedupeKey);
      if (existing) {
        return { stored: false, notification: existing, reason: "duplicate" as const };
      }
      await this.writeList(sanitized.uid, [sanitized, ...items]);
      return { stored: true, notification: sanitized as NotificationEntity };
    });
  }

  /**
   * Store a batch under a single lock acquisition.
   *
   * The tray import needs this: importing one at a time would take and release
   * the lock per notification, letting a concurrent import interleave and see a
   * partially written list.
   */
  async saveMany(uid: string, notifications: readonly NotificationEntity[]): Promise<{
    stored: NotificationEntity[];
    skipped: NotificationEntity[];
  }> {
    if (!uid || notifications.length === 0) return { stored: [], skipped: [] };
    return this.mutex.run(listLock(uid), async () => {
      const dismissed = new Set(await this.listDismissed(uid));
      const { items } = await this.readList(uid);
      const byDedupeKey = new Set(items.map((item) => item.dedupeKey));
      const stored: NotificationEntity[] = [];
      const skipped: NotificationEntity[] = [];
      const placeholders: NotificationEntity[] = [];

      for (const candidate of notifications) {
        const sanitized = sanitizeNotificationEntity(candidate);
        if (!sanitized || sanitized.uid !== uid) {
          if (sanitized) skipped.push(sanitized);
          continue;
        }
        if (isEmptyPlaceholder(sanitized)) {
          placeholders.push(sanitized);
          skipped.push(sanitized);
          continue;
        }
        if (
          dismissed.has(sanitized.id) ||
          dismissed.has(sanitized.dedupeKey) ||
          byDedupeKey.has(sanitized.dedupeKey)
        ) {
          skipped.push(sanitized);
          continue;
        }
        byDedupeKey.add(sanitized.dedupeKey);
        stored.push(sanitized);
      }

      if (stored.length > 0) await this.writeList(uid, [...stored, ...items]);
      if (placeholders.length > 0) await this.rememberDismissedMany(placeholders);
      return { stored, skipped };
    });
  }

  async update(
    uid: string,
    notificationId: string,
    patch: Partial<NotificationEntity>,
  ): Promise<void> {
    if (!uid || !notificationId) return;
    await this.mutex.run(listLock(uid), async () => {
      const { items } = await this.readList(uid);
      // Identity is never patchable: allowing it would let a metadata update
      // rewrite the dedupe key and resurrect a dismissed notification.
      const { id: _id, uid: _uid, dedupeKey: _dedupeKey, ...safePatch } = patch;
      void _id;
      void _uid;
      void _dedupeKey;
      await this.writeList(
        uid,
        items.map((item) =>
          item.id === notificationId
            ? { ...item, ...safePatch, updatedAt: new Date().toISOString() }
            : item,
        ),
      );
    });
  }

  async markAllRead(uid: string): Promise<void> {
    if (!uid) return;
    await this.mutex.run(listLock(uid), async () => {
      const now = new Date().toISOString();
      const { items } = await this.readList(uid);
      await this.writeList(
        uid,
        items.map((item) => ({ ...item, readAt: item.readAt ?? now, updatedAt: now })),
      );
    });
  }

  async markManyRead(uid: string, notificationIds: readonly string[]): Promise<void> {
    const ids = new Set(notificationIds);
    if (!uid || ids.size === 0) return;
    await this.mutex.run(listLock(uid), async () => {
      const now = new Date().toISOString();
      const { items } = await this.readList(uid);
      await this.writeList(
        uid,
        items.map((item) =>
          ids.has(item.id)
            ? {
                ...item,
                readAt: item.readAt ?? now,
                openedAt: item.openedAt ?? now,
                updatedAt: now,
              }
            : item,
        ),
      );
    });
  }

  async delete(uid: string, notificationId: string): Promise<void> {
    if (!uid || !notificationId) return;
    await this.mutex.run(listLock(uid), async () => {
      const { items } = await this.readList(uid);
      const deleted = items.find((item) => item.id === notificationId);
      await this.writeList(
        uid,
        items.filter((item) => item.id !== notificationId),
      );
      if (deleted) await this.rememberDismissedMany([deleted]);
    });
  }

  async clear(uid: string): Promise<void> {
    if (!uid) return;
    await this.mutex.run(listLock(uid), async () => {
      const { items } = await this.readList(uid);
      await this.rememberDismissedMany(items);
      await asolDbDelete(ASOL_DB_STORES.NOTIFICATIONS, listKey(uid));
    });
  }

  // ---- dismissed identities ------------------------------------------------

  async listDismissed(uid: string): Promise<string[]> {
    if (!uid) return [];
    const raw = await asolDbGet<unknown[]>(ASOL_DB_STORES.NOTIFICATION_SETTINGS, dismissedKey(uid));
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is string => typeof item === "string" && item.length > 0);
  }

  async rememberDismissed(notification: NotificationEntity): Promise<void> {
    await this.rememberDismissedMany([notification]);
  }

  /**
   * Remember what the user deleted, so a re-delivery cannot restore it.
   *
   * Locked on its own key: this runs from inside a notification-list mutation,
   * and a shared lock would deadlock the caller against itself.
   */
  async rememberDismissedMany(notifications: readonly NotificationEntity[]): Promise<void> {
    const uid = notifications.find((item) => item.uid)?.uid;
    if (!uid) return;
    await this.mutex.run(dismissedLock(uid), async () => {
      const next = new Set(await this.listDismissed(uid));
      for (const notification of notifications) {
        if (notification.uid !== uid) continue;
        if (notification.id) next.add(notification.id);
        if (notification.dedupeKey) next.add(notification.dedupeKey);
      }
      await asolDbSet(
        ASOL_DB_STORES.NOTIFICATION_SETTINGS,
        dismissedKey(uid),
        Array.from(next).slice(-MAX_DISMISSED_IDENTITIES),
      );
    });
  }

  // ---- settings and badge --------------------------------------------------

  async getSettings(uid: string): Promise<NotificationSettings | null> {
    if (!uid) return null;
    return asolDbGet<NotificationSettings>(ASOL_DB_STORES.NOTIFICATION_SETTINGS, settingsKey(uid));
  }

  async saveSettings(settings: NotificationSettings): Promise<void> {
    if (!settings.uid) return;
    await asolDbSet(ASOL_DB_STORES.NOTIFICATION_SETTINGS, settingsKey(settings.uid), settings);
  }

  async getBadge(uid: string): Promise<NotificationBadgeState | null> {
    if (!uid) return null;
    const raw = await asolDbGet<NotificationBadgeState>(
      ASOL_DB_STORES.NOTIFICATION_BADGES,
      badgeKey(uid),
    );
    if (!raw || typeof raw.unreadCount !== "number" || !Number.isFinite(raw.unreadCount)) {
      return null;
    }
    return { ...raw, unreadCount: Math.max(0, Math.trunc(raw.unreadCount)) };
  }

  async saveBadge(state: NotificationBadgeState): Promise<void> {
    if (!state.uid) return;
    await asolDbSet(ASOL_DB_STORES.NOTIFICATION_BADGES, badgeKey(state.uid), {
      ...state,
      unreadCount: Math.max(0, Math.trunc(state.unreadCount)),
    });
  }

  // ---- device tokens -------------------------------------------------------

  async listDeviceTokens(uid: string): Promise<DeviceToken[]> {
    if (!uid) return [];
    const raw = await asolDbGet<unknown[]>(
      ASOL_DB_STORES.NOTIFICATION_DEVICE_TOKENS,
      tokenListKey(uid),
    );
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is DeviceToken => {
      const candidate = item as Partial<DeviceToken> | null;
      return Boolean(
        candidate &&
          typeof candidate.id === "string" &&
          typeof candidate.uid === "string" &&
          typeof candidate.token === "string",
      );
    });
  }

  async saveDeviceToken(token: DeviceToken): Promise<void> {
    if (!token.uid || !token.id) return;
    await this.mutex.run(tokensLock(token.uid), async () => {
      const current = await this.listDeviceTokens(token.uid);
      await asolDbSet(ASOL_DB_STORES.NOTIFICATION_DEVICE_TOKENS, tokenListKey(token.uid), [
        token,
        ...current.filter((item) => item.id !== token.id),
      ]);
    });
  }

  async removeDeviceToken(uid: string, tokenId: string): Promise<void> {
    if (!uid || !tokenId) return;
    await this.mutex.run(tokensLock(uid), async () => {
      const current = await this.listDeviceTokens(uid);
      await asolDbSet(
        ASOL_DB_STORES.NOTIFICATION_DEVICE_TOKENS,
        tokenListKey(uid),
        current.filter((item) => item.id !== tokenId),
      );
    });
  }

  // ---- analytics -----------------------------------------------------------

  async addAnalyticsEvent(event: NotificationAnalyticsEvent): Promise<void> {
    if (!event.uid) return;
    await this.mutex.run(analyticsLock(event.uid), async () => {
      const current =
        (await asolDbGet<NotificationAnalyticsEvent[]>(
          ASOL_DB_STORES.NOTIFICATION_ANALYTICS,
          analyticsListKey(event.uid),
        )) ?? [];
      await asolDbSet(
        ASOL_DB_STORES.NOTIFICATION_ANALYTICS,
        analyticsListKey(event.uid),
        [event, ...(Array.isArray(current) ? current : [])].slice(0, MAX_ANALYTICS_EVENTS),
      );
    });
  }

  // ---- retry queue ---------------------------------------------------------

  async listOfflineQueue(uid: string): Promise<NotificationOfflineOperation[]> {
    if (!uid) return [];
    const raw = await asolDbGet<unknown[]>(
      ASOL_DB_STORES.NOTIFICATION_OFFLINE_QUEUE,
      offlineQueueKey(uid),
    );
    if (!Array.isArray(raw)) return [];
    return raw
      .map((record) => sanitizeRetryOperation(record))
      .filter((record): record is NotificationOfflineOperation => record !== null && record.uid === uid);
  }

  /**
   * Replace the queue under the lock.
   *
   * `mutateOfflineQueue` is the only safe way to change it: a read outside the
   * lock followed by a write inside one would still drop an entry enqueued in
   * between.
   */
  async mutateOfflineQueue(
    uid: string,
    change: (
      queue: NotificationOfflineOperation[],
    ) => NotificationOfflineOperation[] | Promise<NotificationOfflineOperation[]>,
  ): Promise<NotificationOfflineOperation[]> {
    if (!uid) return [];
    return this.mutex.run(queueLock(uid), async () => {
      const next = await change(await this.listOfflineQueue(uid));
      await asolDbSet(ASOL_DB_STORES.NOTIFICATION_OFFLINE_QUEUE, offlineQueueKey(uid), next);
      return next;
    });
  }
}

export const asolNotificationRepository = new AsolNotificationRepository();
