import 'server-only';

import type {
  GenerateNotificationVapidInput,
  NotificationVapidAdminConfig,
  NotificationVapidPublicConfig,
  SaveNotificationVapidInput,
} from '../domain/entities';
import { isSuperAdminIdentity } from '@/features/auth/utils/super-admin';
import { SaveNotificationVapidSettingsCommand } from '../operations/commands/save-notification-vapid-settings.command';
import { GetNotificationVapidSettingsQuery } from '../operations/queries/get-notification-vapid-settings.query';

export class NotificationVapidService {
  constructor(
    private readonly getSettings = new GetNotificationVapidSettingsQuery(),
    private readonly saveSettings = new SaveNotificationVapidSettingsCommand(),
  ) {}

  async getPublic(): Promise<NotificationVapidPublicConfig> {
    const settings = await this.getSettings.execute();
    return {
      enabled: Boolean(settings?.enabled && settings.publicKey),
      publicKey: settings?.publicKey ?? '',
    };
  }

  async getAdmin(identity: { uid: string; phone: string }): Promise<NotificationVapidAdminConfig> {
    this.assertAdmin(identity);
    const settings = await this.getSettings.execute();
    return {
      enabled: Boolean(settings?.enabled),
      publicKey: settings?.publicKey ?? '',
      subject: settings?.subject ?? 'mailto:admin@asol.local',
      hasPrivateKey: Boolean(settings?.privateKey),
      createdAt: settings?.createdAt ?? undefined,
      updatedAt: settings?.updatedAt ?? undefined,
    };
  }

  async generate(input: GenerateNotificationVapidInput): Promise<NotificationVapidAdminConfig> {
    this.assertAdmin(input.identity);
    const settings = await this.saveSettings.generate({ subject: input.subject });
    return this.toAdmin(settings);
  }

  async save(input: SaveNotificationVapidInput): Promise<NotificationVapidAdminConfig> {
    this.assertAdmin(input.identity);
    const settings = await this.saveSettings.update({
      subject: input.subject,
      enabled: input.enabled,
    });
    return this.toAdmin(settings);
  }

  async getPrivateForProvider() {
    const settings = await this.getSettings.execute();
    if (!settings?.enabled || !settings.publicKey || !settings.privateKey) return null;
    return settings;
  }

  private assertAdmin(identity: { uid: string; phone: string }) {
    if (!isSuperAdminIdentity(identity.uid, identity.phone)) throw new Error('forbidden');
  }

  private toAdmin(settings: Awaited<ReturnType<SaveNotificationVapidSettingsCommand['generate']>>): NotificationVapidAdminConfig {
    return {
      enabled: settings.enabled,
      publicKey: settings.publicKey,
      subject: settings.subject,
      hasPrivateKey: Boolean(settings.privateKey),
      createdAt: settings.createdAt ?? undefined,
      updatedAt: settings.updatedAt ?? undefined,
    };
  }
}
