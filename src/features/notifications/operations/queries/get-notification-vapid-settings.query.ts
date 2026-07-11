import 'server-only';

import type { NotificationVapidSecretConfig } from '../../domain/entities';
import { notificationVapidSettingsRepository } from '../../repositories/notification-vapid-settings-repository';

export class GetNotificationVapidSettingsQuery {
  execute(): Promise<NotificationVapidSecretConfig | null> {
    return notificationVapidSettingsRepository.get();
  }
}
