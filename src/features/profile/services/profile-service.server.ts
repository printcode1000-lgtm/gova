import 'server-only';

import type { GetProfileContactsQuery } from '../operations/queries/get-profile-contacts.query';
import type { UpsertProfileContactsCommand } from '../operations/commands/upsert-profile-contacts.command';
import type { GetProfileImageKeysQuery } from '../operations/queries/get-profile-image-keys.query';
import type { UpsertProfileImageKeysCommand } from '../operations/commands/upsert-profile-image-keys.command';
import type { ProfileContactsData, SaveProfileContactsInput } from '../entities/profile-contacts.entity';
import type { SaveStoreImagesInput, StoreImagesData } from '../entities/store-images.entity';
import type { IProfileService } from './profile-service.interface';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';
import { imageStorageOrchestrator } from '@/core/storage/storage/image-storage-orchestrator.server';

const AVATAR_PROFILE_ID = 'avatar';
const COVER_PROFILE_ID = 'cover';

export class ProfileService implements IProfileService {
  constructor(
    private getProfileContactsQuery: GetProfileContactsQuery,
    private upsertProfileContactsCommand: UpsertProfileContactsCommand,
    private getProfileImageKeysQuery: GetProfileImageKeysQuery,
    private upsertProfileImageKeysCommand: UpsertProfileImageKeysCommand,
  ) {}

  async getContacts(uid: string): Promise<ProfileContactsData> {
    return traceServerLayer('server-service', 'ProfileService.getContacts', async () => {
      if (!uid) throw new Error('userNotFound');
      return this.getProfileContactsQuery.execute(uid);
    });
  }

  async saveContacts(input: SaveProfileContactsInput): Promise<ProfileContactsData> {
    return traceServerLayer('server-service', 'ProfileService.saveContacts', async () => {
      if (!input.uid) throw new Error('userNotFound');
      return this.upsertProfileContactsCommand.execute(input);
    });
  }

  async getStoreImages(uid: string): Promise<StoreImagesData> {
    return traceServerLayer('server-service', 'ProfileService.getStoreImages', async () => {
      if (!uid) throw new Error('userNotFound');
      const keys = await this.getProfileImageKeysQuery.execute(uid);
      const avatarImageKey = keys?.avatarImageKey ?? null;
      const coverImageKey = keys?.coverImageKey ?? null;

      return {
        avatarImageKey,
        coverImageKey,
        avatarUrl: avatarImageKey
          ? imageStorageOrchestrator.resolveUrl(AVATAR_PROFILE_ID, avatarImageKey)
          : null,
        coverUrl: coverImageKey
          ? imageStorageOrchestrator.resolveUrl(COVER_PROFILE_ID, coverImageKey)
          : null,
      };
    });
  }

  async saveStoreImages(input: SaveStoreImagesInput): Promise<StoreImagesData> {
    return traceServerLayer('server-service', 'ProfileService.saveStoreImages', async () => {
      if (!input.uid) throw new Error('userNotFound');

      const existing = await this.getProfileImageKeysQuery.execute(input.uid);
      await this.upsertProfileImageKeysCommand.execute(input.uid, {
        avatarImageKey:
          input.avatarImageKey !== undefined ? input.avatarImageKey : (existing?.avatarImageKey ?? null),
        coverImageKey:
          input.coverImageKey !== undefined ? input.coverImageKey : (existing?.coverImageKey ?? null),
      });

      return this.getStoreImages(input.uid);
    });
  }
}
