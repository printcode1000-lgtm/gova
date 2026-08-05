"use client";

import type {
  NotificationOfflineOperation,
  SpecialtyChatReceiptOperation,
} from "../domain/entities";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";

/** Operations are dropped after this many failed replays. */
const MAX_ATTEMPTS = 5;

export interface OfflineQueueHandlers {
  /** Replays a delivery/read receipt. Supplied by the caller that owns the session. */
  sendChatReceipt?: (payload: SpecialtyChatReceiptOperation) => Promise<void>;
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/**
 * Replays notification operations that could not reach the server.
 *
 * Receipts are the only queued kind today: they are the one notification call
 * whose failure the user cannot retry by hand, because it is emitted for them
 * when a card is delivered or opened.
 */
export class NotificationSyncService {
  async enqueue(
    uid: string,
    kind: NotificationOfflineOperation["kind"],
    id: string,
    payload: unknown,
  ): Promise<void> {
    if (!uid) return;
    const now = new Date().toISOString();
    const queue = await asolNotificationRepository.listOfflineQueue(uid);
    if (queue.some((operation) => operation.id === id)) return;
    await asolNotificationRepository.saveOfflineQueue(uid, [
      ...queue,
      { id, uid, kind, payload, attempts: 0, createdAt: now, updatedAt: now },
    ]);
  }

  async sync(uid: string, handlers: OfflineQueueHandlers = {}): Promise<void> {
    if (!uid || !isOnline()) return;
    const queue = await asolNotificationRepository.listOfflineQueue(uid);
    if (queue.length === 0) return;

    const remaining: NotificationOfflineOperation[] = [];
    for (const operation of queue) {
      const handler =
        operation.kind === "chat_receipt" ? handlers.sendChatReceipt : undefined;
      // No handler means nothing can replay this kind in the current runtime;
      // keeping it would grow the queue forever.
      if (!handler) continue;
      try {
        await handler(operation.payload as SpecialtyChatReceiptOperation);
      } catch {
        const attempts = operation.attempts + 1;
        if (attempts < MAX_ATTEMPTS) {
          remaining.push({
            ...operation,
            attempts,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
    await asolNotificationRepository.saveOfflineQueue(uid, remaining);
  }
}

export const notificationSyncService = new NotificationSyncService();
