import 'server-only';

import webpush from 'web-push';
import type { NotificationVapidSecretConfig } from '../../domain/entities';
import { notificationVapidSettingsRepository } from '../../repositories/notification-vapid-settings-repository';

export class SaveNotificationVapidSettingsCommand {
  generate(input: { subject: string }): Promise<NotificationVapidSecretConfig> {
    const keys = webpush.generateVAPIDKeys();
    return notificationVapidSettingsRepository.save({
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      subject: normalizeSubject(input.subject),
      enabled: true,
    });
  }

  update(input: { subject: string; enabled: boolean }): Promise<NotificationVapidSecretConfig> {
    return notificationVapidSettingsRepository.update({
      subject: normalizeSubject(input.subject),
      enabled: input.enabled,
    });
  }
}

function normalizeSubject(subject: string): string {
  const normalized = subject.trim();
  if (!normalized) return 'mailto:admin@gova.local';
  return normalized;
}
