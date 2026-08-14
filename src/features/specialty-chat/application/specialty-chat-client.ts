"use client";

import { asolApi } from "@/core/api/asol-api-client";
import type { UserSession } from "@/features/auth/entities/session.entity";
import { sessionService } from "@/features/auth/services/session-service";
import {
  notifications,
  NotificationCategories,
  NotificationChannels,
  NotificationContentSources,
  NotificationDeliveryStatuses,
  NotificationPriorities,
  NotificationSounds,
  NotificationSyncStates,
  NotificationTargets,
  NotificationTypes,
  type NotificationEntity,
} from "@/features/notifications";
import type { SendSpecialtyMessageInput, SendSpecialtyRequestInput, SendSpecialtyRequestResult, SpecialtyChatPreferenceChanges, SpecialtyChatPreferences, StartProductConversationInput, StartProductConversationResult } from "../domain/types";
import { SPECIALTY_CHAT_KINDS } from "../domain/types";
import { deliverNotificationGrants } from "@/modules/notification-bridge";

function identity(session: UserSession) {
  if (!session.sessionToken) throw new Error("specialtyChatLoginRefreshRequired");
  return { uid: session.uid, phone: session.phone, sessionToken: session.sessionToken };
}

export function isSpecialtyChatSessionTokenFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === "sessionTokenInvalid" || error.message === "sessionTokenExpired")
  );
}

async function clearInvalidSession(error: unknown): Promise<void> {
  if (!isSpecialtyChatSessionTokenFailure(error)) return;
  await sessionService.clearSession();
  window.dispatchEvent(new Event("asol-session-invalid"));
}

async function saveOutgoing(input: {
  uid: string;
  id: string;
  title: string;
  body: string;
  metadata: NotificationEntity["metadata"];
}) {
  const now = new Date().toISOString();
  // Stored through the notification module's public API: it persists the card,
  // counts it, and tells the centre to reload.
  await notifications.sendLocal({
    id: input.id,
    uid: input.uid,
    type: NotificationTypes.Custom,
    source: NotificationContentSources.Custom,
    title: input.title,
    body: input.body,
    category: NotificationCategories.Chat,
    priority: NotificationPriorities.Normal,
    channels: [NotificationChannels.InApp],
    targets: [NotificationTargets.Center],
    groupKey: String(input.metadata?.requestId ?? input.id),
    dedupeKey: input.id,
    sound: NotificationSounds.Silent,
    status: NotificationDeliveryStatuses.Delivered,
    syncState: NotificationSyncStates.Synced,
    readAt: now,
    createdAt: now,
    updatedAt: now,
    metadata: { ...input.metadata, outgoing: true },
  });
}

export const specialtyChatClient = {
  async startProductConversation(
    session: UserSession,
    input: Omit<StartProductConversationInput, "identity">,
  ): Promise<{ conversationKey: string }> {
    const result = await asolApi.post<StartProductConversationResult>(
      "/api/specialty-chat/product-conversations",
      { ...input, identity: identity(session) },
      { notificationGrantDelivery: "manual" },
    );
    const delivery = await deliverNotificationGrants(result);
    if (delivery.delivered < 1) {
      throw new Error("specialtyChatRecipientUnavailable");
    }
    await saveOutgoing({
      uid: session.uid,
      id: input.requestId,
      title: `محادثة حول ${input.productName}`,
      body: input.message,
      metadata: {
        specialtyChatKind: SPECIALTY_CHAT_KINDS.ProductRequest,
        requestId: input.requestId,
        peerUid: input.sellerUid,
        capability: result.capability,
        productId: input.productId,
        productName: input.productName,
        subcategoryName: input.productName,
      },
    });
    return {
      conversationKey: `chat:conversation:${input.requestId}:${input.sellerUid}`,
    };
  },

  async sendRequest(
    session: UserSession,
    input: Omit<SendSpecialtyRequestInput, "identity">,
  ): Promise<SendSpecialtyRequestResult> {
    const result = await asolApi.post<SendSpecialtyRequestResult>(
      "/api/specialty-chat/requests",
      { ...input, identity: identity(session) },
      { notificationGrantDelivery: "manual" },
    );
    const delivery = await deliverNotificationGrants(result);
    const deliveredUsers = delivery.delivered;
    const unavailableUsers = Math.max(0, result.matchedUsers - deliveredUsers);
    if (deliveredUsers > 0) {
      await saveOutgoing({
        uid: session.uid,
        id: input.requestId,
        title: `طلب إلى ${input.subcategoryName}`,
        body: input.message,
        metadata: {
          specialtyChatKind: SPECIALTY_CHAT_KINDS.Request,
          requestId: input.requestId,
          mainCategoryId: input.mainCategoryId,
          subcategoryId: input.subcategoryId,
          mainCategoryName: input.mainCategoryName,
          subcategoryName: input.subcategoryName,
          matchedUsers: result.matchedUsers,
          grantedUsers: result.grantedUsers,
          deliveredUsers,
          unavailableUsers,
        },
      });
    }
    return { ...result, deliveredUsers, unavailableUsers };
  },

  async sendMessage(
    session: UserSession,
    input: Omit<SendSpecialtyMessageInput, "identity"> & { requestId: string; peerUid: string },
  ) {
    const result = await asolApi.post<{
      messageId: string;
      status: string;
      notificationGrants?: string[];
    }>(
      "/api/specialty-chat/messages",
      {
        messageId: input.messageId,
        capability: input.capability,
        message: input.message,
        identity: identity(session),
      },
      { notificationGrantDelivery: "manual" },
    );
    const delivery = await deliverNotificationGrants(result);
    if (delivery.delivered < 1) {
      throw new Error("specialtyChatRecipientUnavailable");
    }
    await saveOutgoing({
      uid: session.uid,
      id: input.messageId,
      title: "رسالة مرسلة",
      body: input.message,
      metadata: {
        specialtyChatKind: SPECIALTY_CHAT_KINDS.Message,
        requestId: input.requestId,
        messageId: input.messageId,
        peerUid: input.peerUid,
        capability: input.capability,
        deliveryStatus: result.status,
      },
    });
    return result;
  },

  async preferences(
    session: UserSession,
    changes?: SpecialtyChatPreferenceChanges,
  ) {
    try {
      return await asolApi.post<SpecialtyChatPreferences>(
        "/api/specialty-chat/preferences",
        {
          identity: identity(session),
          ...(changes ? { changes } : {}),
        },
        { suppressErrorLog: true },
      );
    } catch (error) {
      await clearInvalidSession(error);
      throw error;
    }
  },

  async receipt(
    session: UserSession,
    input: { capability: string; targetMessageId: string; status: "received" | "read" },
  ) {
    const result = await asolApi.post<{
      status: string;
      notificationGrants?: string[];
    }>(
      "/api/specialty-chat/receipts",
      { ...input, identity: identity(session) },
      {
        suppressErrorLog: true,
        notificationGrantDelivery: "manual",
      },
    );
    const delivery = await deliverNotificationGrants(result);
    if (result.status === "failed" || delivery.delivered < 1) {
      throw new Error("specialtyChatReceiptDeliveryFailed");
    }
    return result;
  },
};
