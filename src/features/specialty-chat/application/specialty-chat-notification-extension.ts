"use client";

import type { UserSession } from "@/features/auth";
import {
  notifications,
  type NotificationCenterExtension,
  type NotificationCenterExtensionContext,
  type NotificationEntity,
} from "@/features/notifications";
import { SPECIALTY_CHAT_KINDS } from "../domain/types";
import { specialtyChatClient } from "./specialty-chat-client";

/**
 * Specialty chat's behaviour inside the notification centre.
 *
 * All of this used to live in `use-notifications`, which made the notification
 * module import specialty chat while specialty chat imported it back. It is
 * chat's business, not the centre's: acknowledging a card that has been shown,
 * acknowledging one that has been read, and folding a receipt card into the
 * message it reports on. The centre now calls in through
 * `notifications.registerCenterExtension`, and only this feature knows what a
 * receipt is.
 *
 * Every send is best-effort. A receipt the user cannot retry by hand is queued
 * for replay instead of being lost.
 */

export const SPECIALTY_CHAT_EXTENSION_ID = "specialty-chat";
const RECEIPT_QUEUE_KIND = "chat_receipt";

/** Receipts already being sent, so a re-render does not send them twice. */
const receiptsInFlight = new Set<string>();

interface QueuedReceipt {
  capability: string;
  targetMessageId: string;
  status: "received" | "read";
  notificationId: string;
}

/** The message a receipt would acknowledge, or null when the card takes none. */
function acknowledgeable(item: NotificationEntity): {
  capability: string;
  targetMessageId: string;
} | null {
  const kind = item.metadata?.specialtyChatKind;
  if (
    kind !== SPECIALTY_CHAT_KINDS.Request &&
    kind !== SPECIALTY_CHAT_KINDS.ProductRequest &&
    kind !== SPECIALTY_CHAT_KINDS.ProfileRequest &&
    kind !== SPECIALTY_CHAT_KINDS.Message
  ) {
    return null;
  }
  // A card this device sent is not one this device receives.
  if (item.metadata?.outgoing === true) return null;
  const capability = String(item.metadata?.capability ?? "");
  const targetMessageId = String(
    kind === SPECIALTY_CHAT_KINDS.Request ||
    kind === SPECIALTY_CHAT_KINDS.ProductRequest ||
    kind === SPECIALTY_CHAT_KINDS.ProfileRequest
      ? item.metadata?.requestId ?? ""
      : item.metadata?.messageId ?? "",
  );
  if (!capability || !targetMessageId) return null;
  return { capability, targetMessageId };
}

/** The outgoing card a receipt refers to. */
function isReceiptSubject(item: NotificationEntity, targetMessageId: string): boolean {
  if (item.metadata?.outgoing !== true) return false;
  if (item.id === targetMessageId) return true;
  return targetMessageId.startsWith("req_")
      ? (item.metadata?.specialtyChatKind === SPECIALTY_CHAT_KINDS.Request ||
        item.metadata?.specialtyChatKind === SPECIALTY_CHAT_KINDS.ProductRequest ||
        item.metadata?.specialtyChatKind === SPECIALTY_CHAT_KINDS.ProfileRequest) &&
        item.metadata?.requestId === targetMessageId
    : item.metadata?.messageId === targetMessageId;
}

/**
 * Merge one recipient's acknowledgement into an outgoing card.
 *
 * Recipients are accumulated rather than overwritten: a request goes to many
 * sellers, and the sender's card shows how many have seen it.
 */
function receiptMetadata(
  item: NotificationEntity,
  status: "received" | "read",
  fromUid: string,
): NotificationEntity["metadata"] {
  const now = new Date().toISOString();
  const receivedBy = new Set(
    String(item.metadata?.remoteReceivedBy ?? "").split(",").filter(Boolean),
  );
  const readBy = new Set(
    String(item.metadata?.remoteReadBy ?? "").split(",").filter(Boolean),
  );
  if (fromUid) receivedBy.add(fromUid);
  if (status === "read" && fromUid) readBy.add(fromUid);
  return {
    remoteReceivedAt: String(item.metadata?.remoteReceivedAt ?? now),
    remoteReceivedBy: [...receivedBy].join(","),
    remoteReceivedCount: receivedBy.size,
    ...(status === "read"
      ? {
          remoteReadAt: now,
          remoteReadBy: [...readBy].join(","),
          remoteReadCount: readBy.size,
        }
      : {}),
  };
}

async function sendReceipt(
  session: UserSession,
  uid: string,
  receipt: QueuedReceipt,
): Promise<void> {
  await specialtyChatClient.receipt(session, {
    capability: receipt.capability,
    targetMessageId: receipt.targetMessageId,
    status: receipt.status,
  });
  if (receipt.status === "received") {
    await notifications.patchMetadata({
      uid,
      notificationId: receipt.notificationId,
      metadata: { receivedReceiptSent: true },
    });
  }
}

/** Acknowledge every incoming card this device has not acknowledged yet. */
function acknowledgeDelivered(
  session: UserSession,
  context: NotificationCenterExtensionContext,
): void {
  for (const item of context.notifications) {
    if (item.metadata?.receivedReceiptSent === true) continue;
    const target = acknowledgeable(item);
    if (!target) continue;
    const key = `${context.uid}:${item.id}:received`;
    if (receiptsInFlight.has(key)) continue;
    receiptsInFlight.add(key);
    const receipt: QueuedReceipt = {
      ...target,
      status: "received",
      notificationId: item.id,
    };
    void sendReceipt(session, context.uid, receipt)
      .catch(async (error: unknown) => {
        console.warn("[SpecialtyChat] Failed to send received receipt.", error);
        // The sender is waiting on this and the user has no way to retry it,
        // so it is replayed the next time the centre synchronises.
        await notifications.enqueueRetry({
          uid: context.uid,
          kind: RECEIPT_QUEUE_KIND,
          id: key,
          payload: receipt,
        });
      })
      .finally(() => receiptsInFlight.delete(key));
  }
}

export function createSpecialtyChatNotificationExtension(
  session: UserSession,
): NotificationCenterExtension {
  return {
    id: SPECIALTY_CHAT_EXTENSION_ID,

    async reconcile(context) {
      let changed = false;
      for (const card of context.notifications) {
        if (card.metadata?.specialtyChatKind !== SPECIALTY_CHAT_KINDS.Receipt) continue;
        const targetMessageId = String(card.metadata?.targetMessageId ?? "");
        const status = card.metadata?.receiptStatus;
        if (targetMessageId && (status === "received" || status === "read")) {
          const subject = context.notifications.find((item) =>
            isReceiptSubject(item, targetMessageId),
          );
          if (subject) {
            await notifications.patchMetadata({
              uid: context.uid,
              notificationId: subject.id,
              metadata: receiptMetadata(
                subject,
                status,
                String(card.metadata?.receiptFromUid ?? ""),
              ),
            });
          }
        }
        // A receipt is a signal, not something the user reads: once folded in,
        // the card itself is removed from the centre.
        await notifications.dismiss({ uid: context.uid, notificationId: card.id });
        changed = true;
      }
      if (session.sessionToken) acknowledgeDelivered(session, context);
      return changed;
    },

    onRead(context) {
      if (!session.sessionToken) return;
      for (const item of context.notifications) {
        const target = acknowledgeable(item);
        if (!target) continue;
        void specialtyChatClient
          .receipt(session, { ...target, status: "read" })
          .catch((error: unknown) => {
            console.warn("[SpecialtyChat] Failed to send read receipt.", error);
          });
      }
    },

    async replayQueuedOperation(operation) {
      if (operation.kind !== RECEIPT_QUEUE_KIND) return false;
      if (!session.sessionToken) return false;
      await sendReceipt(session, session.uid, operation.payload as QueuedReceipt);
      return true;
    },
  };
}
