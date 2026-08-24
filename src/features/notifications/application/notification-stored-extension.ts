"use client";

import type { NotificationEntity } from "@asol/notifications-core";
import { notificationLog } from "../domain/notification-redaction";

export interface NotificationStoredExtension {
  readonly id: string;
  onStored(notification: NotificationEntity): Promise<void> | void;
}

const extensions = new Map<string, NotificationStoredExtension>();

export function registerNotificationStoredExtension(
  extension: NotificationStoredExtension,
): () => void {
  extensions.set(extension.id, extension);
  return () => {
    if (extensions.get(extension.id) === extension) extensions.delete(extension.id);
  };
}

export async function runNotificationStoredExtensions(
  notification: NotificationEntity,
): Promise<void> {
  for (const extension of extensions.values()) {
    try {
      await extension.onStored(notification);
    } catch (error) {
      notificationLog.warn(`Stored-notification extension "${extension.id}" failed.`, error);
    }
  }
}
