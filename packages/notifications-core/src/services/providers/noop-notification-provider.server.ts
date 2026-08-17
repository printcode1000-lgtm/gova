import type {
  NotificationProvider,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
} from './notification-provider.interface';

export class NoopNotificationProvider implements NotificationProvider {
  readonly provider = 'noop';

  async send(input: NotificationProviderSendInput): Promise<NotificationProviderSendResult> {
    return {
      provider: this.provider,
      tokenCount: input.tokens.length,
      status: 'queued',
      message: 'Provider boundary ready; external push transport is not configured yet.',
    };
  }
}
