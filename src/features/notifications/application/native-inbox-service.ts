"use client";

import type { NotificationEntity } from "@asol/notifications-core";
import { notificationLog } from "../domain/notification-redaction";
import {
  nativeInboxService as nativeInboxInfraService,
  type MappedInboxRecord,
} from "../infrastructure/native/native-inbox.service";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { SingleFlight } from "./shared/keyed-mutex";
import { notificationLifecycleService } from "./notification-lifecycle-service";
import { notificationReceiver } from "./notification-receiver";

/**
 * Draining the device-local inbox into the notification centre.
 *
 * ## The lifecycle this closes
 *
 * ```
 * FCM receipt
 *   → validate and normalize natively
 *   → persist into the local, private native inbox
 *   → post the Android notification on the existing ASOL channel
 *   → (app or session starts)
 *   → read pending records for the authenticated uid   ← here
 *   → persist into IndexedDB exactly once              ← here
 *   → refresh the centre and the badge                 ← here
 *   → acknowledge, deleting the native records         ← here
 * ```
 *
 * ## Save first, acknowledge second
 *
 * The two steps are separate and ordered, and that is the entire durability
 * argument. A storage error, a WebView crash, or the process being killed
 * between them leaves the record on disk, so the next start imports it again.
 * The reverse order would make any of those a permanently lost notification,
 * and none of them are rare on Android.
 *
 * A duplicate import costs nothing: the repository deduplicates by
 * `dedupeKey` under a per-user lock, so live receive, the native inbox, the
 * tray sweep, a tap callback, a restart, and a repeated import together still
 * produce exactly one row.
 *
 * ## What may be acknowledged
 *
 * Only outcomes that mean *IndexedDB durably knows this notification*:
 *
 * | Outcome | Acknowledged | Why |
 * |---|---|---|
 * | stored | yes | the row exists |
 * | duplicate | yes | an identical row already exists |
 * | dismissed | yes | the user deleted it; re-importing would resurrect it |
 * | unmappable | yes | no payload can ever produce a row, so retrying is a loop |
 * | the batch threw | **no** | nothing is known; every record is retried |
 *
 * ## User isolation
 *
 * Every read is scoped to the authenticated uid, natively and again here. A
 * record belonging to another account is never imported and never acknowledged
 * — it simply waits on disk until its own user signs in, bounded only by the
 * documented retention policy.
 */

export interface InboxImportSummary {
  /** Records that reached IndexedDB for the first time in this import. */
  imported: NotificationEntity[];
  /** Records deleted from the native inbox. */
  acknowledged: number;
  /** Records left in place for a later retry. */
  retained: number;
}

const EMPTY_SUMMARY: InboxImportSummary = { imported: [], acknowledged: 0, retained: 0 };

export class NativeInboxService {
  private readonly flights = new SingleFlight();
  private readonly tapFlights = new SingleFlight();
  private tapHandler: (() => void) | null = null;
  private tapSubscription: Promise<() => void> | null = null;

  isSupported(): boolean {
    return nativeInboxInfraService.isSupported();
  }

  /**
   * Import every pending record for `uid`, then acknowledge what stuck.
   *
   * Single-flight per user: session start, the resume listener, and a live push
   * can all ask within the same tick, and doing the work three times would rest
   * the exactly-once guarantee on storage dedupe alone rather than on not doing
   * it three times.
   */
  async importPending(uid: string): Promise<InboxImportSummary> {
    if (!uid || !this.isSupported()) return EMPTY_SUMMARY;
    return this.flights.run(`native-inbox:${uid}`, () => this.drain(uid));
  }

  private async drain(uid: string): Promise<InboxImportSummary> {
    const records = await nativeInboxInfraService.listPending(uid);
    if (records.length === 0) return EMPTY_SUMMARY;

    const storable = records.filter(
      (record): record is MappedInboxRecord & { entity: NotificationEntity } =>
        record.entity !== null,
    );
    // A record that cannot map to anything storable is retired immediately:
    // keeping it would mean retrying a payload that is guaranteed to fail until
    // the retention window expires.
    const acknowledgeable = records
      .filter((record) => record.entity === null)
      .map((record) => record.recordId);

    if (storable.length > 0) {
      let results: Awaited<ReturnType<typeof notificationReceiver.receiveBatch>>;
      try {
        results = await notificationReceiver.receiveBatch(
          uid,
          storable.map((record) => record.entity),
        );
      } catch (error) {
        // Storage failed. Nothing is acknowledged, so every record — including
        // the unmappable ones, whose deletion is not urgent — is retried.
        notificationLog.error("The device-local notification inbox could not be imported.", error);
        return { imported: [], acknowledged: 0, retained: records.length };
      }

      const outcomes = new Map(results.map((result) => [result.notification.id, result]));
      const imported: NotificationEntity[] = [];
      for (const record of storable) {
        const outcome = outcomes.get(record.entity.id);
        if (!outcome) continue; // Unknown outcome: leave it for the next import.
        if (outcome.stored) imported.push(outcome.notification);
        // `duplicate` and `dismissed` both mean IndexedDB already holds this
        // identity durably, which is exactly what acknowledgement asserts.
        acknowledgeable.push(record.recordId);
      }

      const acknowledged = await nativeInboxInfraService.acknowledge(uid, acknowledgeable);
      return {
        imported,
        acknowledged,
        retained: records.length - acknowledged,
      };
    }

    const acknowledged = await nativeInboxInfraService.acknowledge(uid, acknowledgeable);
    return { imported: [], acknowledged, retained: records.length - acknowledged };
  }

  /**
   * Handle a notification the user tapped, from any application state.
   *
   * The tap is a pointer into the inbox, not a copy of the payload, so it can be
   * read late and replayed safely. The sequence is fixed:
   *
   * 1. read the tap;
   * 2. verify it belongs to the authenticated user — a tap for a different
   *    account is left pending, never applied to whoever is signed in now;
   * 3. import *everything* pending, so the notifications the user did not tap
   *    reach the centre too;
   * 4. mark only the tapped notification read;
   * 5. clear the tap, last, so an interruption anywhere above replays it.
   *
   * @returns the tapped notification once it is stored and marked read.
   */
  async consumePendingTap(uid: string): Promise<NotificationEntity | null> {
    if (!uid || !this.isSupported()) return null;
    return this.tapFlights.run(`native-inbox-tap:${uid}`, () =>
      this.consumePendingTapOnce(uid),
    );
  }

  private async consumePendingTapOnce(
    uid: string,
  ): Promise<NotificationEntity | null> {
    const tap = await nativeInboxInfraService.readPendingTap();
    if (!tap) return null;
    if (tap.uid && tap.uid !== uid) {
      // Someone else's notification. It stays pending for its own user.
      return null;
    }

    await this.importPending(uid);

    const notificationId = tap.notificationId || tap.record?.notificationId || "";
    let target: NotificationEntity | undefined;
    try {
      const stored = await asolNotificationRepository.list(uid);
      target = notificationId
        ? stored.find((item) => item.id === notificationId)
        : undefined;
      // Only the tapped notification. The rest were imported by the step above
      // and stay unread, which is what keeps the badge honest.
      if (target) await notificationLifecycleService.markRead(uid, target.id);
    } catch (error) {
      // The tap is deliberately left pending: it replays on the next start.
      notificationLog.error("A tapped notification could not be marked read.", error);
      return null;
    }

    if (!target) {
      // If the record is still pending, persistence failed (or produced no
      // durable outcome). Keep the tap so the next launch retries it. When the
      // record is gone, the notification was already acknowledged/dismissed and
      // this is only a stale tray tap, which is safe to retire.
      const pendingAfterImport = await nativeInboxInfraService.readPendingTap();
      if (pendingAfterImport?.record) return null;
      await nativeInboxInfraService.clearPendingTap();
      return null;
    }

    // Last, and only now: everything above is durable, so an interruption
    // before this point costs a replay rather than a lost notification.
    await nativeInboxInfraService.clearPendingTap();
    // Re-read, so the caller receives the notification with its read state and
    // its original business route exactly as the centre will render it.
    const refreshed = await asolNotificationRepository.list(uid);
    return refreshed.find((item) => item.id === target.id) ?? target;
  }

  /**
   * Taps arriving while the session is live.
   *
   * The listener carries no payload of its own — it only says "a tap happened",
   * and the handler re-reads it through `consumePendingTap`. A warm tap and a
   * cold-start tap therefore run the identical protocol, so there is one path
   * that can lose a notification instead of two.
   */
  async onTap(listener: () => void): Promise<() => void> {
    this.tapHandler = listener;
    this.tapSubscription ??= nativeInboxInfraService.onTap(() => {
      this.tapHandler?.();
    });
    await this.tapSubscription;
    return () => {
      if (this.tapHandler === listener) this.tapHandler = null;
    };
  }

  /** Erase the inbox. Account deletion and explicit local-data wipe only. */
  clear(): Promise<void> {
    return nativeInboxInfraService.clear();
  }

  pendingCount(): Promise<number> {
    return nativeInboxInfraService.pendingCount();
  }
}

export const nativeInboxService = new NativeInboxService();
