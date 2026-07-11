import 'server-only';

import type {
  NotificationTokenDeliveryResult,
  RegisteredNotificationToken,
  SendNotificationToUsersInput,
  SendNotificationToUsersResult,
} from '../domain/entities';
import { ListNotificationTokensQuery } from '../operations/queries/list-notification-tokens.query';
import { NotificationProviderRegistry } from './providers/notification-provider-registry.server';

export class NotificationSendService {
  constructor(
    private readonly listTokens = new ListNotificationTokensQuery(),
    private readonly providers = new NotificationProviderRegistry(),
  ) {}

  async sendToUsers(input: SendNotificationToUsersInput): Promise<SendNotificationToUsersResult> {
    const uids = Array.from(new Set(input.uids.map((uid) => uid.trim()).filter(Boolean)));
    if (uids.length === 0) throw new Error('notificationRecipientsRequired');
    if (!input.dedupeKey) throw new Error('notificationDedupeKeyRequired');
    if (!input.templateId && (!input.title || !input.body)) {
      throw new Error('notificationContentRequired');
    }

    const tokensByUid = await this.listTokens.byUids(uids);
    const results = await Promise.all(
      uids.map(async (uid): Promise<NotificationTokenDeliveryResult> => {
        const tokens = tokensByUid[uid] ?? [];
        if (tokens.length === 0) {
          return { uid, tokenCount: 0, status: 'no_tokens' };
        }

        const providers = await this.sendByProvider(tokens, input);
        return {
          uid,
          tokenCount: tokens.length,
          status: providers.some((provider) => provider.status === 'queued') ? 'queued' : 'no_tokens',
          providers,
        };
      }),
    );

    return { requested: uids.length, results };
  }

  private async sendByProvider(tokens: RegisteredNotificationToken[], input: SendNotificationToUsersInput) {
    const tokensByProvider = tokens.reduce<Record<string, RegisteredNotificationToken[]>>((acc, token) => {
      const provider = token.provider || 'noop';
      acc[provider] = [...(acc[provider] ?? []), token];
      return acc;
    }, {});

    return Promise.all(
      Object.entries(tokensByProvider).map(([providerKey, providerTokens]) =>
        this.providers.get(providerKey).send({
          tokens: providerTokens,
          payload: {
            locale: input.locale ?? 'ar',
            templateId: input.templateId,
            title: input.title,
            body: input.body,
            dedupeKey: input.dedupeKey,
            variables: input.variables,
            metadata: input.metadata,
          },
        }),
      ),
    );
  }
}
