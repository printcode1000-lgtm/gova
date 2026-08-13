"use client";

import {
  pushNotifications,
  type NotificationInboxRecord,
  type NotificationInboxTap,
} from "@/native-platform/notifications";
import type { Unsubscribe } from "@/native-platform";
import type { NotificationEntity } from "../../domain/entities";
import {
  isEmptySystemPlaceholderPayload,
  mapInboundPushToNotification,
} from "../../domain/inbound-notification-mapper";
import { notificationLog } from "../../domain/notification-redaction";
import { capacitorPlatformService } from "./capacitor-platform.service";

/**
 * The Android device-local notification inbox, as the module sees it.
 *
 * ## What the inbox is for
 *
 * The permanent notification centre is IndexedDB/AsolDB. IndexedDB lives inside
 * the WebView, and a WebView cannot execute while the app is backgrounded with
 * its process reclaimed, swiped away, or not yet started — which is exactly when
 * most pushes arrive. The native side therefore writes every inbound message to
 * an application-private, encrypted, on-device file *before* it posts the system
 * notification, and this adapter is what drains that file into IndexedDB once a
 * session exists.
 *
 * It is a handoff buffer with a bounded lifetime, not a second store: nothing is
 * ever sent anywhere, and a record is deleted the moment — and only the moment —
 * the notification is confirmed present in IndexedDB.
 *
 * ## Why not the tray
 *
 * `NotificationManager.getActiveNotifications()` was the previous recovery
 * mechanism and cannot work: a notification with `autoCancel` is removed from
 * the tray by the tap itself, so the single case that matters most — the user
 * opening the app *by* tapping the notification — is the case where the tray is
 * already empty. The tray scan is kept as a secondary sweep for notifications
 * posted by older builds; it is no longer load-bearing.
 *
 * ## What this adapter does not do
 *
 * It does not persist, deduplicate, or decide what a notification means. It maps
 * a record through the same domain mapper a live push goes through and hands the
 * result upward. Storage and acknowledgement ordering belong to the application
 * layer, which is the only place that knows whether IndexedDB actually accepted
 * the write.
 */

/** A pending record paired with the entity it maps to. */
export interface MappedInboxRecord {
  recordId: string;
  uid: string;
  /** Null when the payload carried nothing storable. */
  entity: NotificationEntity | null;
}

export class CapacitorNativeInboxService {
  /** True only where a device-local inbox exists: the Android shell. */
  isSupported(): boolean {
    return (
      capacitorPlatformService.isNative() &&
      capacitorPlatformService.getPlatform() === "android"
    );
  }

  /**
   * Pending records for one user, mapped and oldest first.
   *
   * A record whose payload cannot produce a notification is returned with a null
   * entity rather than dropped, because the caller still has to decide what to
   * acknowledge — silently discarding it here would leave it on disk forever.
   */
  async listPending(uid: string): Promise<MappedInboxRecord[]> {
    if (!this.isSupported() || !uid) return [];
    let records: NotificationInboxRecord[];
    try {
      records = await pushNotifications.listPendingInbox(uid);
    } catch (error) {
      // An older shell without the native inbox, or a bridge that is not up
      // yet. Startup must not break; the tray sweep still runs.
      notificationLog.warn("The device-local notification inbox is unavailable.", error);
      return [];
    }

    return records
      // Belt and braces: the native store filters by uid already, so a record
      // for another user reaching here would be a native bug — and it must
      // still never be imported under the signed-in account.
      .filter((record) => record.uid === uid)
      .map((record) => ({
        recordId: record.recordId,
        uid: record.uid,
        entity: isEmptySystemPlaceholderPayload(record.payload)
          ? null
          : mapInboundPushToNotification(uid, record.payload),
      }));
  }

  /**
   * Delete records the caller has confirmed are in IndexedDB.
   *
   * Failure is reported, never thrown: a record that could not be deleted is
   * simply imported again next time, and the repository's dedupe makes that a
   * no-op. Throwing here would turn a harmless retry into a failed startup.
   */
  async acknowledge(uid: string, recordIds: readonly string[]): Promise<number> {
    if (!this.isSupported() || !uid || recordIds.length === 0) return 0;
    try {
      return await pushNotifications.acknowledgeInbox(uid, recordIds);
    } catch (error) {
      notificationLog.warn("Notification inbox records could not be acknowledged.", error);
      return 0;
    }
  }

  /** Erase the inbox. Account deletion and explicit local-data wipe only. */
  async clear(): Promise<void> {
    if (!this.isSupported()) return;
    await pushNotifications.clearInbox();
  }

  async pendingCount(): Promise<number> {
    if (!this.isSupported()) return 0;
    try {
      return await pushNotifications.pendingInboxCount();
    } catch {
      return 0;
    }
  }

  /** The tap this process was launched with, if it is still unhandled. */
  async readPendingTap(): Promise<NotificationInboxTap | null> {
    if (!this.isSupported()) return null;
    try {
      return await pushNotifications.getInboxTap();
    } catch (error) {
      notificationLog.warn("A pending notification tap could not be read.", error);
      return null;
    }
  }

  /** Give up the pending tap. Only after its notification is stored and read. */
  async clearPendingTap(): Promise<void> {
    if (!this.isSupported()) return;
    // Do not report the tap as consumed when the durable pointer could not be
    // deleted. Propagating keeps navigation behind the final commit: the next
    // launch can safely retry the already-deduplicated import and clear again.
    await pushNotifications.clearInboxTap();
  }

  /** Taps that arrive while this process is already running. */
  async onTap(listener: (tap: NotificationInboxTap) => void): Promise<Unsubscribe> {
    if (!this.isSupported()) return () => undefined;
    try {
      await pushNotifications.ensureInboxTapListener();
    } catch (error) {
      notificationLog.warn("The notification tap listener could not be attached.", error);
      return () => undefined;
    }
    return pushNotifications.onInboxTap(listener);
  }
}

export const capacitorNativeInboxService = new CapacitorNativeInboxService();
