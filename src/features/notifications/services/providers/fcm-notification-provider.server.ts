import type {
  NotificationProvider,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
} from './notification-provider.interface';

export class FcmNotificationProvider implements NotificationProvider {
  readonly provider = 'fcm';

  async send(input: NotificationProviderSendInput): Promise<NotificationProviderSendResult> {
    return {
      provider: this.provider,
      tokenCount: input.tokens.length,
      status: 'queued',
      message: 'FCM adapter placeholder. Server credentials and SDK transport must be added server-side only.',
    };
  }
}
