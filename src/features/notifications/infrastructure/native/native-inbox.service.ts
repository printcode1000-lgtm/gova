"use client";

import {
  NativeCore,
  type NotificationInboxRecord,
  type NotificationInboxTap,
  type Unsubscribe,
} from "@asol/native-core";
import type { NotificationEntity } from "@asol/notifications-core";
import {
  isEmptySystemPlaceholderPayload,
  mapInboundPushToNotification,
} from "../../domain/inbound-notification-mapper";
import { notificationLog } from "../../domain/notification-redaction";
import { nativePlatformService } from "./native-platform.service";

/**
 * The Android device-local notification inbox service.
 */

export interface MappedInboxRecord {
  recordId: string;
  uid: string;
  entity: NotificationEntity | null;
}

export class NativeInboxService {
  isSupported(): boolean {
    return (
      nativePlatformService.isNative() &&
      nativePlatformService.getPlatform() === "android"
    );
  }

  async listPending(uid: string): Promise<MappedInboxRecord[]> {
    if (!this.isSupported() || !uid) return [];
    const res = await NativeCore.listPendingInbox(uid);
    if (!res.ok) {
      notificationLog.warn("The device-local notification inbox is unavailable.", res.error);
      return [];
    }

    return res.value
      .filter((record) => record.uid === uid)
      .map((record) => ({
        recordId: record.recordId,
        uid: record.uid,
        entity: isEmptySystemPlaceholderPayload(record.payload)
          ? null
          : mapInboundPushToNotification(uid, record.payload),
      }));
  }

  async acknowledge(uid: string, recordIds: readonly string[]): Promise<number> {
    if (!this.isSupported() || !uid || recordIds.length === 0) return 0;
    const res = await NativeCore.acknowledgeInbox(uid, recordIds);
    if (!res.ok) {
      notificationLog.warn("Notification inbox records could not be acknowledged.", res.error);
      return 0;
    }
    return res.value;
  }

  async clear(): Promise<void> {
    if (!this.isSupported()) return;
    await NativeCore.clearInbox();
  }

  async pendingCount(): Promise<number> {
    if (!this.isSupported()) return 0;
    const res = await NativeCore.getPendingInboxCount();
    return res.ok ? res.value : 0;
  }

  async readPendingTap(): Promise<NotificationInboxTap | null> {
    if (!this.isSupported()) return null;
    const res = await NativeCore.getPendingInboxTap();
    if (!res.ok) {
      notificationLog.warn("A pending notification tap could not be read.", res.error);
      return null;
    }
    return res.value;
  }

  async clearPendingTap(): Promise<void> {
    if (!this.isSupported()) return;
    await NativeCore.clearPendingInboxTap();
  }

  async onTap(listener: (tap: NotificationInboxTap) => void): Promise<Unsubscribe> {
    if (!this.isSupported()) return () => undefined;
    const res = await NativeCore.onInboxTap(listener);
    if (!res.ok) {
      notificationLog.warn("The notification tap listener could not be attached.", res.error);
      return () => undefined;
    }
    return res.value;
  }
}

export const nativeInboxService = new NativeInboxService();
