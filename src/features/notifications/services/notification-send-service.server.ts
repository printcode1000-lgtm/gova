import "server-only";

import type {
  NotificationLocale,
  NotificationTokenDeliveryResult,
  RegisteredNotificationToken,
  SendNotificationToUsersInput,
  SendNotificationToUsersResult,
} from "../domain/entities";
import { ListNotificationTokensQuery } from "@/modules/data-access/domains/notifications/operations/queries/list-notification-tokens.query";
import { DeleteNotificationTokenCommand } from "@/modules/data-access/domains/notifications/operations/commands/delete-notification-token.command";
import { NotificationBuilder } from "../application/notification-builder";
import {
  NotificationCategories,
  NotificationPriorities,
  NotificationSounds,
} from "../domain/enums";
import { createNotificationId } from "../shared/create-notification-id";
import { NotificationProviderRegistry } from "./providers/notification-provider-registry.server";
import { RemoteDispatchTransport } from "./providers/remote-dispatch-transport.server";
import type { NotificationProviderPayload } from "./providers/notification-provider.interface";

export class NotificationSendService {
  constructor(
    private readonly listTokens = new ListNotificationTokensQuery(),
    private readonly providers = new NotificationProviderRegistry(),
    private readonly deleteToken = new DeleteNotificationTokenCommand(),
    private readonly builder = new NotificationBuilder(),
    private readonly remote = new RemoteDispatchTransport(),
  ) {}

  /**
   * Entry point for business flows.
   *
   * When a notifications deployment is configured, the fan-out is forwarded to
   * it so the provider requests are billed to that account. Otherwise it runs
   * in-process, which is what local development and single-deployment setups do.
   */
  async sendToUsers(
    input: SendNotificationToUsersInput,
  ): Promise<SendNotificationToUsersResult> {
    if (this.remote.isConfigured()) {
      return this.remote.send(input);
    }
    return this.sendToUsersLocally(input);
  }

  /**
   * Always fans out in this process, never forwarding.
   *
   * `POST /api/notifications/send` must call this rather than `sendToUsers`:
   * the notifications deployment runs the same code, and forwarding there would
   * make it call itself forever.
   */
  async sendToUsersLocally(
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
    // Grouped by transport *and* language: one payload is built per group, so
    // a user reading English and a user reading Arabic each get their own text
    // from a single send call.
    const groups = tokens.reduce<
      Record<string, { provider: string; locale: NotificationLocale; tokens: RegisteredNotificationToken[] }>
    >((acc, token) => {
      const provider = token.provider || "noop";
      const locale = this.resolveLocale(token, input);
      const key = `${provider}:${locale}`;
      const group = acc[key] ?? { provider, locale, tokens: [] };
      group.tokens.push(token);
      acc[key] = group;
      return acc;
    }, {});

    const results = await Promise.all(
      Object.values(groups).map(async (group) => {
        const result = await this.providers.get(group.provider).send({
          tokens: group.tokens,
          payload: this.buildProviderPayload(input, group.locale),
        });
        return { ...result, locale: group.locale };
      }),
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

  /** The device's own language wins; the caller's value is only a fallback. */
  private resolveLocale(
    token: RegisteredNotificationToken,
    input: SendNotificationToUsersInput,
  ): NotificationLocale {
    if (token.locale === "ar" || token.locale === "en") return token.locale;
    return input.locale ?? "ar";
  }

  private buildProviderPayload(
    input: SendNotificationToUsersInput,
    locale: NotificationLocale,
  ): NotificationProviderPayload {
    const variables = {
      ...(input.variables ?? {}),
      ...(input.variablesByLocale?.[locale] ?? {}),
    };
    const route = input.routeByLocale?.[locale] ?? input.route;
    if (input.templateId) {
      const built = this.builder.fromTemplate({
        uid: "server",
        notificationId: createNotificationId(),
        templateId: input.templateId,
        dedupeKey: input.dedupeKey,
        locale,
        variables,
        route,
        metadata: input.metadata,
      });
      return {
        notificationId: built.id,
        locale,
        templateId: input.templateId,
        title: built.title,
        body: built.body,
        category: built.category,
        priority: input.priority ?? built.priority,
        route: built.route,
        groupKey: built.groupKey,
        sound: input.sound ?? built.sound,
        dedupeKey: input.dedupeKey,
        variables,
        metadata: input.metadata,
      };
    }
    return {
      notificationId: createNotificationId(),
      locale,
      title: input.title?.trim() || "ASOL",
      body: input.body?.trim() || "",
      category: input.category ?? NotificationCategories.System,
      priority: input.priority ?? NotificationPriorities.Normal,
      route: route ?? {
        href: String(input.metadata?.href ?? "/notifications"),
        label: locale === "ar" ? "فتح" : "Open",
      },
      sound: input.sound ?? NotificationSounds.Default,
      dedupeKey: input.dedupeKey,
      variables,
      metadata: input.metadata,
    };
  }
}
