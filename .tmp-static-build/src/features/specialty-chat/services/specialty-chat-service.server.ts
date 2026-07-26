import "server-only";

import { categoryService } from "@/features/categories";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { GetNotificationUserIdentityQuery } from "@/features/notifications/operations/queries/get-notification-user-identity.query";
import { GetSpecialtyRequestPreferenceQuery } from "@/features/notifications/operations/queries/get-specialty-request-preference.query";
import { SetSpecialtyRequestPreferenceCommand } from "@/features/notifications/operations/commands/set-specialty-request-preference.command";
import { notificationSendService } from "@/features/notifications/services/notification-service.bootstrap.server";
import { NotificationCategories, NotificationPriorities, NotificationSounds } from "@/features/notifications/domain/enums";
import { createSpecialtyChatCapability, verifySpecialtyChatCapability } from "./specialty-chat-capability.server";
import { SPECIALTY_CHAT_KINDS, type SendSpecialtyMessageInput, type SendSpecialtyReceiptInput, type SendSpecialtyRequestInput, type SendSpecialtyRequestResult, type SpecialtyChatIdentity } from "../domain/types";
import { getSpecialtyChatSubOptions } from "../domain/specialty-options";
import { verifySignedSessionToken } from "@/features/auth/services/signed-session-token.server";

const MAX_MESSAGE_LENGTH = 800;
const MAX_RECIPIENTS = 500;
const recentRequests = new Map<string, number[]>();

function validateMessage(message: string): string {
  const value = message.trim();
  if (!value || value.length > MAX_MESSAGE_LENGTH) throw new Error("specialtyChatMessageInvalid");
  return value;
}

function rateLimit(uid: string): void {
  const now = Date.now();
  const recent = (recentRequests.get(uid) ?? []).filter((value) => now - value < 60_000);
  if (recent.length >= 5) throw new Error("specialtyChatRateLimited");
  recentRequests.set(uid, [...recent, now]);
}

export class SpecialtyChatService {
  private readonly identities = new GetNotificationUserIdentityQuery();
  private readonly getPreferenceQuery = new GetSpecialtyRequestPreferenceQuery();
  private readonly setPreferenceCommand = new SetSpecialtyRequestPreferenceCommand();

  private async assertIdentity(identity: SpecialtyChatIdentity) {
    const claims = verifySignedSessionToken(identity.sessionToken?.trim() ?? "");
    if (claims.uid !== identity.uid.trim()) {
      throw new Error("forbidden");
    }
    const user = await this.identities.execute(identity.uid.trim());
    if (!user || user.phone !== identity.phone.trim()) throw new Error("forbidden");
    return user;
  }

  async sendRequest(input: SendSpecialtyRequestInput): Promise<SendSpecialtyRequestResult> {
    const actor = await this.assertIdentity(input.identity);
    rateLimit(actor.uid);
    const message = validateMessage(input.message);
    if (!/^req_[a-zA-Z0-9_-]{8,100}$/.test(input.requestId)) throw new Error("specialtyChatRequestInvalid");
    const main = categoryService.getProfileMainOptions().find((item) => item.id === input.mainCategoryId);
    const sub = main
      ? getSpecialtyChatSubOptions(main)
          .find((item) => item.originalId === input.subcategoryId && item.selectable)
      : undefined;
    if (!main || !sub) throw new Error("specialtyChatSelectionInvalid");

    const matched = await profileService.getUsersBySpecialty(main.id, input.subcategoryId, 0, MAX_RECIPIENTS);
    const candidates = Array.from(new Set(matched.map((item) => item.uid))).filter((uid) => uid !== actor.uid);
    const enabled = await this.getPreferenceQuery.enabledUids(candidates);

    const deliveries = await Promise.all(
      enabled.map(async (sellerUid) => {
        const capability = createSpecialtyChatCapability({ requestId: input.requestId, buyerUid: actor.uid, sellerUid });
        const result = await notificationSendService.sendToUsers({
          actorUid: actor.uid,
          uids: [sellerUid],
          title: `طلب جديد: ${sub.nameAr}`,
          body: message,
          dedupeKey: `${input.requestId}:${sellerUid}`,
          category: NotificationCategories.Chat,
          priority: NotificationPriorities.High,
          sound: NotificationSounds.Default,
          route: { href: "/notifications", label: "عرض والرد" },
          metadata: {
            specialtyChatKind: SPECIALTY_CHAT_KINDS.Request,
            requestId: input.requestId,
            senderUid: actor.uid,
            peerUid: actor.uid,
            mainCategoryId: main.id,
            subcategoryId: input.subcategoryId,
            mainCategoryName: main.nameAr,
            subcategoryName: sub.nameAr,
            capability,
          },
        });
        const delivery = result.results[0];
        return Boolean(
          delivery &&
            ["sent", "queued", "partial"].includes(delivery.status) &&
            delivery.providers?.some(
              (provider) =>
                (provider.provider === "fcm" ||
                  provider.provider === "web_push" ||
                  provider.provider === "apns") &&
                provider.status !== "failed",
            ),
        );
      }),
    );
    const acceptedUsers = deliveries.filter(Boolean).length;
    return {
      requestId: input.requestId,
      matchedUsers: candidates.length,
      acceptedUsers,
      unavailableUsers: candidates.length - acceptedUsers,
    };
  }

  async sendMessage(input: SendSpecialtyMessageInput) {
    const actor = await this.assertIdentity(input.identity);
    rateLimit(actor.uid);
    const message = validateMessage(input.message);
    if (!/^msg_[a-zA-Z0-9_-]{8,100}$/.test(input.messageId)) throw new Error("specialtyChatMessageInvalid");
    const capability = verifySpecialtyChatCapability(input.capability);
    const actorIsBuyer = actor.uid === capability.buyerUid;
    const actorIsSeller = actor.uid === capability.sellerUid;
    if (!actorIsBuyer && !actorIsSeller) throw new Error("forbidden");
    const recipientUid = actorIsBuyer ? capability.sellerUid : capability.buyerUid;
    const result = await notificationSendService.sendToUsers({
      actorUid: actor.uid,
      uids: [recipientUid],
      title: actorIsSeller ? "رد جديد على طلبك" : "رسالة جديدة من المشتري",
      body: message,
      dedupeKey: input.messageId,
      category: NotificationCategories.Chat,
      priority: NotificationPriorities.High,
      sound: NotificationSounds.Default,
      route: { href: "/notifications", label: "عرض والرد" },
      metadata: {
        specialtyChatKind: SPECIALTY_CHAT_KINDS.Message,
        requestId: capability.requestId,
        messageId: input.messageId,
        senderUid: actor.uid,
        peerUid: actor.uid,
        capability: input.capability,
      },
    });
    return { messageId: input.messageId, status: result.results[0]?.status ?? "failed" };
  }

  async getPreference(identity: SpecialtyChatIdentity) {
    const actor = await this.assertIdentity(identity);
    return { enabled: await this.getPreferenceQuery.execute(actor.uid) };
  }

  async setPreference(identity: SpecialtyChatIdentity, enabled: boolean) {
    const actor = await this.assertIdentity(identity);
    await this.setPreferenceCommand.execute(actor.uid, enabled);
    return { enabled };
  }

  async sendReceipt(input: SendSpecialtyReceiptInput) {
    const actor = await this.assertIdentity(input.identity);
    const capability = verifySpecialtyChatCapability(input.capability);
    const actorIsBuyer = actor.uid === capability.buyerUid;
    const actorIsSeller = actor.uid === capability.sellerUid;
    if (!actorIsBuyer && !actorIsSeller) throw new Error("forbidden");
    if (!/^(req|msg)_[a-zA-Z0-9_-]{8,100}$/.test(input.targetMessageId)) {
      throw new Error("specialtyChatMessageInvalid");
    }
    if (input.status !== "received" && input.status !== "read") throw new Error("specialtyChatReceiptInvalid");
    const recipientUid = actorIsBuyer ? capability.sellerUid : capability.buyerUid;
    const dedupeKey = `receipt:${input.targetMessageId}:${input.status}:${actor.uid}`;
    const result = await notificationSendService.sendToUsers({
      actorUid: actor.uid,
      uids: [recipientUid],
      title: "حالة الرسالة",
      body: input.status,
      dedupeKey,
      category: NotificationCategories.Chat,
      priority: NotificationPriorities.Normal,
      sound: NotificationSounds.Silent,
      metadata: {
        specialtyChatKind: SPECIALTY_CHAT_KINDS.Receipt,
        targetMessageId: input.targetMessageId,
        receiptStatus: input.status,
        receiptFromUid: actor.uid,
        dataOnly: true,
      },
    });
    return { status: result.results[0]?.status ?? "failed" };
  }
}

export const specialtyChatService = new SpecialtyChatService();
