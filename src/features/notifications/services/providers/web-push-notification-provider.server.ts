import type {
  NotificationProvider,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
} from './notification-provider.interface';
import webpush from 'web-push';
import { NotificationVapidService } from '../notification-vapid-service.server';

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
    const payload = JSON.stringify({
      title: input.payload.title ?? input.payload.templateId ?? 'ASOL',
      body: input.payload.body ?? String(input.payload.variables?.message ?? ''),
      dedupeKey: input.payload.dedupeKey,
      href: String(input.payload.metadata?.href ?? '/notifications'),
    });

    const results = await Promise.allSettled(
      input.tokens.map((token) => webpush.sendNotification(JSON.parse(token.token), payload)),
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
