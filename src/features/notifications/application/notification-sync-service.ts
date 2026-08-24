"use client";

import type { NotificationOfflineOperation } from "@asol/notifications-core";
import { notificationLog } from "../domain/notification-redaction";
import { assertRetryKind, assertString, assertUid } from "../domain/notification-validation";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { SingleFlight } from "./shared/keyed-mutex";

/** Operations are dropped after this many failed replays. */
const MAX_ATTEMPTS = 5;
/** A hostile or wedged queue cannot grow without bound. */
const MAX_QUEUE_LENGTH = 200;

/**
 * Replays one queued operation.
 *
 * The service does not know what any operation means — only that something
 * outside it does. The caller answers `false` for an operation nothing owns, and
 * the service drops it rather than growing the queue forever.
 */
export type QueuedOperationReplay = (operation: {
  kind: string;
  payload: unknown;
}) => Promise<boolean> | boolean;

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/**
 * Replays notification operations that could not reach the server.
 *
 * It queues, counts attempts, and forgets — it never interprets a payload. What
 * an operation means belongs to whoever enqueued it, which reaches the service
 * as a `QueuedOperationReplay`.
 *
 * Two concurrency rules:
 *
 * - Every queue change goes through `mutateOfflineQueue`, so an enqueue racing a
 *   sync cannot be erased by the sync's rewrite.
 * - A sync per user is single-flight. `useNotifications` triggers one on mount,
 *   on the `online` event, and on every change event; without coalescing, one
 *   burst would replay the same receipt several times.
 */
export class NotificationSyncService {
  private readonly flights = new SingleFlight();

  async enqueue(
    uid: string,
    kind: NotificationOfflineOperation["kind"],
    id: string,
    payload: unknown,
  ): Promise<void> {
    const safeUid = assertUid(uid);
    const safeKind = assertRetryKind(kind);
    const safeId = assertString(id, "id", 256);

    await asolNotificationRepository.mutateOfflineQueue(safeUid, (queue) => {
      if (queue.some((operation) => operation.id === safeId)) return queue;
      if (queue.length >= MAX_QUEUE_LENGTH) {
        notificationLog.warn("Retry queue is full; dropping the oldest entry.", {
          length: queue.length,
        });
        queue = queue.slice(1);
      }
      const now = new Date().toISOString();
      return [
        ...queue,
        {
          id: safeId,
          uid: safeUid,
          kind: safeKind,
          payload,
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        },
      ];
    });
  }

  /** Operations still waiting to be replayed. Read-only; used by diagnostics. */
  async listPending(uid: string): Promise<NotificationOfflineOperation[]> {
    if (!uid) return [];
    return asolNotificationRepository.listOfflineQueue(uid);
  }

  /**
   * Replay everything queued for a user.
   *
   * The replay itself runs outside the queue lock — it makes network calls, and
   * holding a storage lock across those would block the notification centre —
   * then the outcome is applied under the lock by identity, so an entry enqueued
   * during the replay survives.
   */
  async sync(uid: string, replay?: QueuedOperationReplay): Promise<void> {
    if (!uid || !isOnline() || !replay) return;
    await this.flights.run(`sync:${uid}`, async () => {
      const queue = await asolNotificationRepository.listOfflineQueue(uid);
      if (queue.length === 0) return;

      const failed = new Map<string, number>();
      const settled = new Set<string>();

      for (const operation of queue) {
        try {
          const claimed = await replay({ kind: operation.kind, payload: operation.payload });
          // Unclaimed: nothing in this runtime can replay it, so keeping it
          // would grow the queue forever.
          settled.add(operation.id);
          if (!claimed) continue;
        } catch (error) {
          notificationLog.warn("Retry replay failed.", { kind: operation.kind, error });
          failed.set(operation.id, operation.attempts + 1);
        }
      }

      await asolNotificationRepository.mutateOfflineQueue(uid, (current) =>
        current
          .filter((operation) => !settled.has(operation.id))
          .map((operation) => {
            const attempts = failed.get(operation.id);
            return attempts === undefined
              ? operation
              : { ...operation, attempts, updatedAt: new Date().toISOString() };
          })
          .filter((operation) => operation.attempts < MAX_ATTEMPTS),
      );
    });
  }
}

export const notificationSyncService = new NotificationSyncService();
