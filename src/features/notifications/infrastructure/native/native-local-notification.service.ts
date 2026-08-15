"use client";

import { NativeCore } from "@asol/native-core";
import type { NotificationEntity } from "../../domain/entities";
import {
  localNotificationSoundFile,
  resolveAndroidChannelId,
} from "../../domain/notification-sound";
import { nativePlatformService } from "./native-platform.service";

/**
 * Immediate on-device display of a notification the application produced.
 *
 * Delegates to the NativeCore Local Notifications facade, so the same
 * code path serves the browser, Android, and iOS. It must not call
 * `new Notification(...)` or a Capacitor plugin directly.
 */
export class NativeLocalNotificationService {
  async display(notification: NotificationEntity): Promise<void> {
    const platform = nativePlatformService.getPlatform();
    await NativeCore.scheduleLocalNotification({
      id: numericId(notification.dedupeKey || notification.id),
      title: notification.title,
      body: notification.body,
      channelId: resolveAndroidChannelId({
        category: notification.category,
        priority: notification.priority,
        sound: notification.sound,
        source: notification.metadata?.source,
      }),
      sound: localNotificationSoundFile(platform, notification.sound),
      data: toExtra(notification),
    });
  }
}

function toExtra(notification: NotificationEntity): Record<string, string> {
  const extra: Record<string, string> = {
    notificationId: notification.id,
    dedupeKey: notification.dedupeKey,
    title: notification.title,
    body: notification.body,
    category: notification.category,
    priority: notification.priority,
    sound: notification.sound,
    createdAt: notification.createdAt,
  };
  if (notification.templateId) extra.templateId = notification.templateId;
  if (notification.route?.href) extra.routeHref = notification.route.href;
  if (notification.route?.label) extra.routeLabel = notification.route.label;
  if (notification.groupKey) extra.groupKey = notification.groupKey;
  for (const [key, value] of Object.entries(notification.metadata ?? {})) {
    if (value !== null && value !== undefined) extra[`meta_${key}`] = String(value);
  }
  return extra;
}

function numericId(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const nativeLocalNotificationService = new NativeLocalNotificationService();
