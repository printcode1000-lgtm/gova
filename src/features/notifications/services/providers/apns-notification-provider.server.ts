import type {
  NotificationProvider,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
} from './notification-provider.interface';

export class ApnsNotificationProvider implements NotificationProvider {
  readonly provider = 'apns';

  async send(input: NotificationProviderSendInput): Promise<NotificationProviderSendResult> {
    return {
      provider: this.provider,
      tokenCount: input.tokens.length,
      status: 'queued',
      message: 'APNs adapter placeholder. Apple credentials and transport must remain server-side.',
    };
  }
}
