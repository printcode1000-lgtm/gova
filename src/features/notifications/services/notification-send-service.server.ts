import "server-only";

import type {
  NotificationTokenDeliveryResult,
  RegisteredNotificationToken,
  SendNotificationToUsersInput,
  SendNotificationToUsersResult,
} from "../domain/entities";
import { ListNotificationTokensQuery } from "../operations/queries/list-notification-tokens.query";
import { DeleteNotificationTokenCommand } from "../operations/commands/delete-notification-token.command";
import { NotificationBuilder } from "../application/notification-builder";
import {
  NotificationCategories,
  NotificationPriorities,
  NotificationSounds,
} from "../domain/enums";
import { createNotificationId } from "../shared/create-notification-id";
import { NotificationProviderRegistry } from "./providers/notification-provider-registry.server";
import type { NotificationProviderPayload } from "./providers/notification-provider.interface";

export class NotificationSendService {
  constructor(
    private readonly listTokens = new ListNotificationTokensQuery(),
    private readonly providers = new NotificationProviderRegistry(),
    private readonly deleteToken = new DeleteNotificationTokenCommand(),
    private readonly builder = new NotificationBuilder(),
  ) {}

  async sendToUsers(
    input: SendNotificationToUsersInput,
  ): Promise<SendNotificationToUsersResult> {
    const uids = Array.from(
      new Set(input.uids.map((uid) => uid.trim()).filter(Boolean)),
    );
    if (uids.length === 0) throw new Error("notificationRecipientsRequired");
    if (!input.dedupeKey) throw new Error("notificationDedupeKeyRequired");
    if (!input.templateId && (!input.title || !input.body)) {
      throw new Error("notificationContentRequired");
    }

    const tokensByUid = await this.listTokens.byUids(uids);
    const results = await Promise.all(
      uids.map(async (uid): Promise<NotificationTokenDeliveryResult> => {
        const tokens = tokensByUid[uid] ?? [];
        if (tokens.length === 0) {
          return { uid, tokenCount: 0, status: "no_tokens" };
        }

        const providers = await this.sendByProvider(tokens, input);
        const statuses = providers.map((provider) => provider.status);
        const status = statuses.every((value) => value === "failed")
          ? "failed"
          : statuses.some((value) => value === "partial" || value === "failed")
            ? "partial"
            : statuses.some((value) => value === "queued")
              ? "queued"
              : "sent";
        return {
          uid,
          tokenCount: tokens.length,
          status,
          providers,
        };
      }),
    );

    return { requested: uids.length, results };
  }

  private async sendByProvider(
    tokens: RegisteredNotificationToken[],
    input: SendNotificationToUsersInput,
  ) {
    const tokensByProvider = tokens.reduce<
      Record<string, RegisteredNotificationToken[]>
    >((acc, token) => {
      const provider = token.provider || "noop";
      acc[provider] = [...(acc[provider] ?? []), token];
      return acc;
    }, {});

    const payload = this.buildProviderPayload(input);
    const results = await Promise.all(
      Object.entries(tokensByProvider).map(([providerKey, providerTokens]) =>
        this.providers.get(providerKey).send({
          tokens: providerTokens,
          payload,
        }),
      ),
    );
    const invalidIds = new Set(
      results.flatMap((result) => result.invalidTokenIds ?? []),
    );
    await Promise.all(
      tokens
        .filter((token) => invalidIds.has(token.id))
        .map((token) =>
          this.deleteToken.execute({ uid: token.uid, tokenId: token.id }),
        ),
    );
    return results;
  }

  private buildProviderPayload(
    input: SendNotificationToUsersInput,
  ): NotificationProviderPayload {
    const locale = input.locale ?? "ar";
    if (input.templateId) {
      const built = this.builder.fromTemplate({
        uid: "server",
        notificationId: createNotificationId(),
        templateId: input.templateId,
        dedupeKey: input.dedupeKey,
        locale,
        variables: input.variables,
        metadata: input.metadata,
      });
      return {
        notificationId: built.id,
        locale,
        templateId: input.templateId,
        title: built.title,
        body: built.body,
        category: built.category,
        priority: built.priority,
        route: built.route,
        groupKey: built.groupKey,
        sound: built.sound,
        dedupeKey: input.dedupeKey,
        variables: input.variables,
        metadata: input.metadata,
      };
    }
    return {
      notificationId: createNotificationId(),
      locale,
      title: input.title?.trim() || "ASOL",
      body: input.body?.trim() || "",
      category: NotificationCategories.System,
      priority: NotificationPriorities.Normal,
      route: {
        href: String(input.metadata?.href ?? "/notifications"),
        label: locale === "ar" ? "فتح" : "Open",
      },
      sound: NotificationSounds.Default,
      dedupeKey: input.dedupeKey,
      variables: input.variables,
      metadata: input.metadata,
    };
  }
}
