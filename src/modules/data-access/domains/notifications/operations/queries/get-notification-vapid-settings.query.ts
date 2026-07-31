import 'server-only';

import type { NotificationVapidSecretConfig } from '@/features/notifications/domain/entities';
import { notificationVapidSettingsRepository } from '@/modules/data-access/domains/notifications/repositories/notification-vapid-settings-repository';

export class GetNotificationVapidSettingsQuery {
  execute(): Promise<NotificationVapidSecretConfig | null> {
    return notificationVapidSettingsRepository.get();
  }
}
