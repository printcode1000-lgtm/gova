import "server-only";

import type {
  NotificationLocale,
  NotificationTokenDeliveryResult,
  RegisteredNotificationToken,
  SendNotificationToUsersInput,
  SendNotificationToUsersResult,
} from "../domain/entities";
import { notificationTokenStore } from "../ports/token-store";
import { NotificationBuilder } from "../domain/notification-builder";
import {
  NotificationCategories,
  NotificationPriorities,
  NotificationSounds,
} from "../domain/enums";
import { createNotificationId } from "../domain/create-notification-id";
import { NotificationProviderRegistry } from "./providers/notification-provider-registry.server";
import type { NotificationProviderPayload } from "./providers/notification-provider.interface";

/**
 * Narrows a recipient's registrations to the platforms a send asked for.
 *
 * No `platforms` means every device, which is what a user-visible notification
 * wants. A send that names them is addressing a device capability, and a
 * recipient with no matching device reports `no_tokens` — the caller decides
 * whether that is an outage.
 */
export function selectTokensForPlatforms(
  tokens: RegisteredNotificationToken[],
  platforms: SendNotificationToUsersInput["platforms"],
): RegisteredNotificationToken[] {
  if (!platforms || platforms.length === 0) return tokens;
  const allowed = new Set(platforms);
  return tokens.filter((token) => allowed.has(token.platform));
}

export class NotificationSendService {
  constructor(
    private readonly providers = new NotificationProviderRegistry(),
    private readonly builder = new NotificationBuilder(),
    private readonly tokens = notificationTokenStore,
  ) {}

  /**
   * Fans out to every registered device of every recipient.
   *
   * This runs on the notifications service and nowhere else. The main app never
   * calls it: it has no path to this deployment and no provider credentials. It
   * signs a grant instead, and the browser delivers that grant here.
   *
   * The name keeps `Locally` because that is exactly what it means — send in
   * this process, no forwarding anywhere.
   */
  async sendToUsersLocally(
    input: SendNotificationToUsersInput,
  ): Promise<SendNotificationToUsersResult> {
    const uids = Array.from(
      new Set(input.uids.map((uid) => uid.trim()).filter(Boolean)),
    );
    if (uids.length === 0) throw new Error("notificationRecipientsRequired");
    if (!input.dedupeKey) throw new Error("notificationDedupeKeyRequired");
    // A data-only send is a machine signal (the verification SMS dispatch is
    // one): it never reaches a tray, so it has no text to require. Refusing it
    // here dropped every Egyptian verification before FCM was ever called.
    const dataOnly = input.metadata?.dataOnly === true;
    if (!dataOnly && !input.templateId && (!input.title || !input.body)) {
      throw new Error("notificationContentRequired");
    }

    // Checked before any token lookup: a muted account gets no send of any
    // kind, and the registration underneath is never touched by this switch.
    const pushEnabledUids = new Set(
      await this.tokens().pushEnabledUids(uids),
    );
    const tokensByUid = await this.tokens().tokensByUid(uids);
    const results = await Promise.all(
      uids.map(async (uid): Promise<NotificationTokenDeliveryResult> => {
        if (!pushEnabledUids.has(uid)) {
          return { uid, tokenCount: 0, status: "muted" };
        }
        const tokens = selectTokensForPlatforms(tokensByUid[uid] ?? [], input.platforms);
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
          this.tokens().deleteToken({ uid: token.uid, tokenId: token.id }),
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
      title: input.title?.trim() || "Pbook",
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
