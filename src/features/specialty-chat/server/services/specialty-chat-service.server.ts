import "server-only";

import { categoryService } from "@/features/categories";
import { profileService } from "@/features/profile/server";
import { GetNotificationUserIdentityQuery } from "@asol/data-core/notifications";
import { GetSpecialtyChatPreferencesQuery } from "@asol/data-core/notifications";
import { SetSpecialtyChatPreferencesCommand } from "@asol/data-core/notifications";
import {
  notificationsServer,
  NotificationCategories,
  NotificationPriorities,
  NotificationSounds,
} from "@/features/notifications/server";
import { createSpecialtyChatCapability, verifySpecialtyChatCapability } from "./specialty-chat-capability.server";
import { SPECIALTY_CHAT_KINDS, type SendSpecialtyMessageInput, type SendSpecialtyReceiptInput, type SendSpecialtyRequestInput, type SendSpecialtyRequestResult, type SpecialtyChatIdentity, type SpecialtyChatPreferenceChanges, type StartProductConversationInput, type StartProductConversationResult, type StartProfileConversationInput, type StartProfileConversationResult } from "../../domain/types";
import { getSpecialtyChatSubOptions } from "../../domain/specialty-options";
import { verifySignedSessionToken } from "@asol/auth-core/server";
import { productService } from "@/features/product/server";

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
  private readonly getPreferencesQuery = new GetSpecialtyChatPreferencesQuery();
  private readonly setPreferencesCommand = new SetSpecialtyChatPreferencesCommand();

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
    const enabled = await this.getPreferencesQuery.specialtyRequestEnabledUids(candidates);

    // One grant per provider: each carries its own reply capability and its own
    // dedupe key, so they cannot be collapsed into a single authorisation.
    const grants = notificationsServer.createGrantIssuer(actor.uid);
    for (const sellerUid of enabled) {
      const capability = createSpecialtyChatCapability({ requestId: input.requestId, buyerUid: actor.uid, sellerUid });
      grants.issue({
        actorUid: actor.uid,
        uids: [sellerUid],
        templateId: "specialty.request",
        dedupeKey: `${input.requestId}:${sellerUid}`,
        // The body is the buyer's own text and is never translated; only the
        // surrounding title follows the reader's language.
        variables: { message },
        variablesByLocale: {
          ar: { specialtyName: sub.nameAr },
          en: { specialtyName: sub.nameEn || sub.nameAr },
        },
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
    }

    const grantedUsers = grants.size;
    return {
      requestId: input.requestId,
      matchedUsers: candidates.length,
      grantedUsers,
      unavailableUsers: candidates.length - grantedUsers,
      notificationGrants: grants.toArray(),
    };
  }

  async startProductConversation(
    input: StartProductConversationInput,
  ): Promise<StartProductConversationResult> {
    const actor = await this.assertIdentity(input.identity);
    rateLimit(actor.uid);
    const message = validateMessage(input.message);
    const sellerUid = input.sellerUid.trim();
    if (!sellerUid || sellerUid === actor.uid) throw new Error("specialtyChatRecipientInvalid");
    if (!/^req_[a-zA-Z0-9_-]{8,100}$/.test(input.requestId)) {
      throw new Error("specialtyChatRequestInvalid");
    }
    const product = await productService.get(input.productId.trim());
    if (product.uid !== sellerUid) throw new Error("specialtyChatRecipientInvalid");
    const productName = (
      product.mainData.name ||
      product.pharmacySpecs.nameAr ||
      product.pharmacySpecs.nameEn ||
      product.id
    ).slice(0, 200);
    const seller = await this.identities.execute(sellerUid);
    const sellerPreferences = seller
      ? await this.getPreferencesQuery.execute(sellerUid)
      : null;
    if (!seller || !sellerPreferences?.productConversationsEnabled) {
      throw new Error("specialtyChatRecipientUnavailable");
    }
    const capability = createSpecialtyChatCapability({
      requestId: input.requestId,
      buyerUid: actor.uid,
      sellerUid,
    });
    const grants = notificationsServer.createGrantIssuer(actor.uid);
    const issued = grants.issue({
      actorUid: actor.uid,
      uids: [sellerUid],
      templateId: "specialty.messageFromBuyer",
      variables: { message },
      dedupeKey: `${input.requestId}:${sellerUid}`,
      metadata: {
        specialtyChatKind: SPECIALTY_CHAT_KINDS.ProductRequest,
        requestId: input.requestId,
        senderUid: actor.uid,
        peerUid: actor.uid,
        productId: input.productId.trim(),
        productName,
        subcategoryName: productName,
        capability,
      },
    });
    if (!issued) throw new Error("specialtyChatRecipientUnavailable");
    return {
      requestId: input.requestId,
      sellerUid,
      capability,
      notificationGrants: grants.toArray(),
    };
  }

  async startProfileConversation(
    input: StartProfileConversationInput,
  ): Promise<StartProfileConversationResult> {
    const actor = await this.assertIdentity(input.identity);
    rateLimit(actor.uid);
    const message = validateMessage(input.message);
    const sellerUid = input.sellerUid.trim();
    if (!sellerUid || sellerUid === actor.uid) {
      throw new Error("specialtyChatRecipientInvalid");
    }
    if (!/^req_[a-zA-Z0-9_-]{8,100}$/.test(input.requestId)) {
      throw new Error("specialtyChatRequestInvalid");
    }

    const seller = await this.identities.execute(sellerUid);
    const sellerPreferences = seller
      ? await this.getPreferencesQuery.execute(sellerUid)
      : null;
    if (!seller || !sellerPreferences?.productConversationsEnabled) {
      throw new Error("specialtyChatRecipientUnavailable");
    }

    const details = await profileService.getStoreDetails(sellerUid);
    const storeName = (details.storeName || sellerUid).slice(0, 200);
    const capability = createSpecialtyChatCapability({
      requestId: input.requestId,
      buyerUid: actor.uid,
      sellerUid,
    });
    const grants = notificationsServer.createGrantIssuer(actor.uid);
    const issued = grants.issue({
      actorUid: actor.uid,
      uids: [sellerUid],
      templateId: "specialty.messageFromBuyer",
      variables: { message },
      dedupeKey: `${input.requestId}:${sellerUid}`,
      metadata: {
        specialtyChatKind: SPECIALTY_CHAT_KINDS.ProfileRequest,
        requestId: input.requestId,
        senderUid: actor.uid,
        peerUid: actor.uid,
        profileUid: sellerUid,
        storeName,
        subcategoryName: storeName,
        capability,
      },
    });
    if (!issued) throw new Error("specialtyChatRecipientUnavailable");
    return {
      requestId: input.requestId,
      sellerUid,
      capability,
      notificationGrants: grants.toArray(),
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
    const grants = notificationsServer.createGrantIssuer(actor.uid);
    const issued = grants.issue({
      actorUid: actor.uid,
      uids: [recipientUid],
      templateId: actorIsSeller
        ? "specialty.replyFromProvider"
        : "specialty.messageFromBuyer",
      variables: { message },
      dedupeKey: input.messageId,
      metadata: {
        specialtyChatKind: SPECIALTY_CHAT_KINDS.Message,
        requestId: capability.requestId,
        messageId: input.messageId,
        senderUid: actor.uid,
        peerUid: actor.uid,
        capability: input.capability,
      },
    });
    // "granted", not "sent": the browser still has to carry it across.
    return {
      messageId: input.messageId,
      status: issued ? "granted" : "failed",
      notificationGrants: grants.toArray(),
    };
  }

  async getPreferences(identity: SpecialtyChatIdentity) {
    const actor = await this.assertIdentity(identity);
    return this.getPreferencesQuery.execute(actor.uid);
  }

  async setPreferences(
    identity: SpecialtyChatIdentity,
    changes: SpecialtyChatPreferenceChanges,
  ) {
    const actor = await this.assertIdentity(identity);
    return this.setPreferencesCommand.execute(actor.uid, changes);
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
    const grants = notificationsServer.createGrantIssuer(actor.uid);
    const issued = grants.issue({
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
    return {
      status: issued ? "granted" : "failed",
      notificationGrants: grants.toArray(),
    };
  }
}

export const specialtyChatService = new SpecialtyChatService();
