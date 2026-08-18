import "server-only";

import type {
  NotificationLocale,
  RegisteredNotificationToken,
  SendNotificationToUsersInput,
} from "@asol/notifications-core";
import {
  MAX_GRANTS_PER_REQUEST,
  verifyNotificationGrant,
} from "@asol/notifications-core/server";
import { DeleteNotificationTokenCommand } from "@/modules/data-access/domains/notifications/operations/commands/delete-notification-token.command";
import { ListNotificationTokensQuery } from "@/modules/data-access/domains/notifications/operations/queries/list-notification-tokens.query";
import { GetNotificationPushPreferenceQuery } from "@/modules/data-access/domains/notifications/operations/queries/get-notification-push-preference.query";
import { GetNotificationUserIdentityQuery } from "@/modules/data-access/domains/notifications/operations/queries/get-notification-user-identity.query";

export interface RecipientTokenGrantResult {
  send: SendNotificationToUsersInput;
  recipients: Array<{
    uid: string;
    status: "muted" | "no_tokens" | "ready";
    tokens: RegisteredNotificationToken[];
  }>;
}

export interface ResolveRecipientTokensInput {
  uid: string;
  phone: string;
  grants: string[];
}

export interface ResolveRecipientTokensResult {
  grants: RecipientTokenGrantResult[];
}

const MOBILE_PUSH_PROVIDERS = new Set(["fcm"]);

export class NotificationRecipientTokensService {
  constructor(
    private readonly users = new GetNotificationUserIdentityQuery(),
    private readonly listTokens = new ListNotificationTokensQuery(),
    private readonly pushPreference = new GetNotificationPushPreferenceQuery(),
    private readonly deleteToken = new DeleteNotificationTokenCommand(),
  ) {}

  async resolve(input: ResolveRecipientTokensInput): Promise<ResolveRecipientTokensResult> {
    const uid = input.uid.trim();
    const phone = input.phone.trim();
    const user = await this.users.execute(uid);
    if (!user || user.phone !== phone) throw new Error("forbidden");

    const grants = input.grants
      .filter((grant) => typeof grant === "string" && grant.length > 0)
      .slice(0, MAX_GRANTS_PER_REQUEST);

    const resolved: RecipientTokenGrantResult[] = [];
    for (const grant of grants) {
      const payload = verifyNotificationGrant(grant);
      if (payload.actorUid && payload.actorUid !== uid) {
        throw new Error("forbidden");
      }

      const recipientUids = Array.from(
        new Set(payload.send.uids.map((value) => value.trim()).filter(Boolean)),
      );
      const pushEnabled = new Set(
        await this.pushPreference.pushEnabledUids(recipientUids),
      );
      const tokensByUid = await this.listTokens.byUids(recipientUids);

      resolved.push({
        send: payload.send,
        recipients: recipientUids.map((recipientUid) => {
          if (!pushEnabled.has(recipientUid)) {
            return { uid: recipientUid, status: "muted" as const, tokens: [] };
          }
          const tokens = (tokensByUid[recipientUid] ?? []).filter((token) =>
            MOBILE_PUSH_PROVIDERS.has(token.provider),
          );
          if (tokens.length === 0) {
            return { uid: recipientUid, status: "no_tokens" as const, tokens: [] };
          }
          return { uid: recipientUid, status: "ready" as const, tokens };
        }),
      });
    }

    return { grants: resolved };
  }

  /** Remove dead FCM registrations reported by the native sender. */
  async removeInvalidTokens(
    entries: Array<{ uid: string; tokenId: string }>,
  ): Promise<void> {
    await Promise.all(
      entries.map((entry) =>
        this.deleteToken.execute({ uid: entry.uid, tokenId: entry.tokenId }),
      ),
    );
  }

  resolveLocale(
    token: RegisteredNotificationToken,
    input: SendNotificationToUsersInput,
  ): NotificationLocale {
    if (token.locale === "ar" || token.locale === "en") return token.locale;
    return input.locale ?? "ar";
  }
}

export const notificationRecipientTokensService =
  new NotificationRecipientTokensService();
