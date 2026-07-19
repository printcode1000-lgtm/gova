import type {
  NotificationProvider,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
} from './notification-provider.interface';
import webpush from 'web-push';
import { NotificationVapidService } from '../notification-vapid-service.server';
import type { RegisteredNotificationToken } from '../../domain/entities';

function buildPayload(input: NotificationProviderSendInput, token: RegisteredNotificationToken): string {
  const href = input.payload.route?.href ?? String(input.payload.metadata?.href ?? '/notifications');
  return JSON.stringify({
    uid: token.uid,
    notificationId: input.payload.notificationId,
    templateId: input.payload.templateId,
    dedupeKey: input.payload.dedupeKey,
    title: input.payload.title ?? input.payload.templateId ?? 'ASOL',
    body: input.payload.body ?? String(input.payload.variables?.message ?? ''),
    category: input.payload.category,
    priority: input.payload.priority,
    sound: input.payload.sound,
    groupKey: input.payload.groupKey,
    href,
    routeHref: href,
    routeLabel: input.payload.route?.label,
    createdAt: new Date().toISOString(),
  });
}

export class WebPushNotificationProvider implements NotificationProvider {
  readonly provider = 'web_push';

  constructor(private readonly vapidService = new NotificationVapidService()) {}

  async send(input: NotificationProviderSendInput): Promise<NotificationProviderSendResult> {
    const vapid = await this.vapidService.getPrivateForProvider();
    if (!vapid) {
      return {
        provider: this.provider,
        tokenCount: input.tokens.length,
        status: 'failed',
        message: 'webPushNotConfigured',
      };
    }

    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    const results = await Promise.allSettled(
      input.tokens.map((token) => webpush.sendNotification(JSON.parse(token.token), buildPayload(input, token))),
    );
    const failures = results.filter((result) => result.status === 'rejected');
    return {
      provider: this.provider,
      tokenCount: input.tokens.length,
      status: failures.length === input.tokens.length ? 'failed' : 'queued',
      message: failures.length > 0 ? `${failures.length} web push deliveries failed.` : undefined,
    };
  }
}
