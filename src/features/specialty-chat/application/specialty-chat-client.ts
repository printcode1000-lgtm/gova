"use client";

import { asolApi } from "@/core/api/asol-api-client";
import type { UserSession } from "@/features/auth/entities/session.entity";
import { asolNotificationRepository } from "@/features/notifications/infrastructure/asol-notification-repository";
import { NOTIFICATION_CHANGED_EVENT } from "@/features/notifications/domain/defaults";
import type { NotificationEntity } from "@/features/notifications/domain/entities";
import { NotificationCategories, NotificationChannels, NotificationContentSources, NotificationDeliveryStatuses, NotificationPriorities, NotificationSounds, NotificationSyncStates, NotificationTargets, NotificationTypes } from "@/features/notifications/domain/enums";
import type { SendSpecialtyMessageInput, SendSpecialtyRequestInput, SendSpecialtyRequestResult, SpecialtyChatPreferenceResult } from "../domain/types";
import { SPECIALTY_CHAT_KINDS } from "../domain/types";

function notifyChanged(uid: string) {
  window.dispatchEvent(new CustomEvent(NOTIFICATION_CHANGED_EVENT, { detail: { uid } }));
}

function identity(session: UserSession) {
  if (!session.sessionToken) throw new Error("specialtyChatLoginRefreshRequired");
  return { uid: session.uid, phone: session.phone, sessionToken: session.sessionToken };
}

async function saveOutgoing(input: {
  uid: string;
  id: string;
  title: string;
  body: string;
  metadata: NotificationEntity["metadata"];
}) {
  const now = new Date().toISOString();
  await asolNotificationRepository.save({
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
  notifyChanged(input.uid);
}

export const specialtyChatClient = {
  async sendRequest(
    session: UserSession,
    input: Omit<SendSpecialtyRequestInput, "identity">,
  ): Promise<SendSpecialtyRequestResult> {
    const result = await asolApi.post<SendSpecialtyRequestResult>("/api/specialty-chat/requests", {
      ...input,
      identity: identity(session),
    });
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
        acceptedUsers: result.acceptedUsers,
      },
    });
    return result;
  },

  async sendMessage(
    session: UserSession,
    input: Omit<SendSpecialtyMessageInput, "identity"> & { requestId: string; peerUid: string },
  ) {
    const result = await asolApi.post<{ messageId: string; status: string }>("/api/specialty-chat/messages", {
      messageId: input.messageId,
      capability: input.capability,
      message: input.message,
      identity: identity(session),
    });
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

  preference(session: UserSession, enabled?: boolean) {
    return asolApi.post<SpecialtyChatPreferenceResult>("/api/specialty-chat/preference", {
      identity: identity(session),
      ...(typeof enabled === "boolean" ? { enabled } : {}),
    });
  },

  async receipt(
    session: UserSession,
    input: { capability: string; targetMessageId: string; status: "received" | "read" },
  ) {
    const result = await asolApi.post<{ status: string }>("/api/specialty-chat/receipts", {
      ...input,
      identity: identity(session),
    }, { suppressErrorLog: true });
    if (result.status === "failed") throw new Error("specialtyChatReceiptDeliveryFailed");
    return result;
  },
};
