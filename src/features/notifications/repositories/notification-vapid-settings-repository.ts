import 'server-only';

import { eq } from 'drizzle-orm';
import { dbClient } from '@/core/database/db-client';
import type { IDatabaseClient } from '@/core/database/database-client.interface';
import {
  notificationVapidSettings,
  type NewNotificationVapidSettingsEntity,
  type NotificationVapidSettingsEntity,
} from '@/core/database/schema';
import type { NotificationVapidSecretConfig } from '../domain/entities';

const VAPID_SETTINGS_ID = 'web_push_vapid';

export class NotificationVapidSettingsRepository {
  constructor(private readonly database: IDatabaseClient = dbClient) {}

  async get(): Promise<NotificationVapidSecretConfig | null> {
    const rows = await this.database.db
      .select()
      .from(notificationVapidSettings)
      .where(eq(notificationVapidSettings.id, VAPID_SETTINGS_ID))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async save(input: {
    publicKey: string;
    privateKey: string;
    subject: string;
    enabled: boolean;
  }): Promise<NotificationVapidSecretConfig> {
    const current = await this.get();
    const now = new Date().toISOString();
    const row: NewNotificationVapidSettingsEntity = {
      id: VAPID_SETTINGS_ID,
      publicKey: input.publicKey,
      privateKey: input.privateKey,
      subject: input.subject,
      enabled: input.enabled,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };

    if (current) {
      await this.database.db
        .update(notificationVapidSettings)
        .set({
          publicKey: row.publicKey,
          privateKey: row.privateKey,
          subject: row.subject,
          enabled: row.enabled,
          updatedAt: row.updatedAt,
        })
        .where(eq(notificationVapidSettings.id, VAPID_SETTINGS_ID));
    } else {
      await this.database.db.insert(notificationVapidSettings).values(row);
    }

    const saved = await this.get();
    if (!saved) throw new Error('vapidSaveFailed');
    return saved;
  }

  async update(input: { subject: string; enabled: boolean }): Promise<NotificationVapidSecretConfig> {
    const current = await this.get();
    if (!current) throw new Error('vapidNotConfigured');
    await this.database.db
      .update(notificationVapidSettings)
      .set({
        subject: input.subject,
        enabled: input.enabled,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(notificationVapidSettings.id, VAPID_SETTINGS_ID));
    const saved = await this.get();
    if (!saved) throw new Error('vapidSaveFailed');
    return saved;
  }
}

export const notificationVapidSettingsRepository = new NotificationVapidSettingsRepository();

function toDomain(row: NotificationVapidSettingsEntity): NotificationVapidSecretConfig {
  return {
    enabled: row.enabled,
    publicKey: row.publicKey,
    privateKey: row.privateKey,
    subject: row.subject,
    hasPrivateKey: Boolean(row.privateKey),
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
  };
}
