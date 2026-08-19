import type { NotificationProvider } from './notification-provider.interface';
import { ApnsNotificationProvider } from './apns-notification-provider.server';
import { FcmNotificationProvider } from './fcm-notification-provider.server';
import { NoopNotificationProvider } from './noop-notification-provider.server';
import { WebPushNotificationProvider } from './web-push-notification-provider.server';

export class NotificationProviderRegistry {
  private readonly fallback = new NoopNotificationProvider();
  private readonly providers = new Map<string, NotificationProvider>();

  constructor(providers: NotificationProvider[] = [
    new FcmNotificationProvider(),
    new ApnsNotificationProvider(),
    new WebPushNotificationProvider(),
  ]) {
    providers.forEach((provider) => this.providers.set(provider.provider, provider));
  }

  get(providerKey: string): NotificationProvider {
    return this.providers.get(providerKey) ?? this.fallback;
  }

  listProviderKeys(): string[] {
    return [...this.providers.keys(), this.fallback.provider];
  }
}
