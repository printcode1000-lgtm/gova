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
import { StorageProfiles } from '@/core/storage/constants/storage-profiles';

const AVATAR_PROFILE_ID = StorageProfiles.Avatar;
const COVER_PROFILE_ID = StorageProfiles.Cover;
const MAX_COVER_IMAGES = 3;

function normalizeCoverImageKeys(keys: string[]): string[] {
  return keys.filter((key) => typeof key === 'string' && key.length > 0).slice(0, MAX_COVER_IMAGES);
}

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
      const coverImageKeys = normalizeCoverImageKeys(keys?.coverImageKeys ?? []);
      const coverImageKey = coverImageKeys[0] ?? keys?.coverImageKey ?? null;
      const normalizedCoverImageKeys = coverImageKeys.length > 0
        ? coverImageKeys
        : coverImageKey
        ? [coverImageKey]
        : [];

      return {
        avatarImageKey,
        coverImageKey,
        coverImageKeys: normalizedCoverImageKeys,
        avatarUrl: avatarImageKey
          ? imageStorageOrchestrator.resolveUrl(AVATAR_PROFILE_ID, avatarImageKey)
          : null,
        coverUrl: coverImageKey
          ? imageStorageOrchestrator.resolveUrl(COVER_PROFILE_ID, coverImageKey)
          : null,
        coverUrls: normalizedCoverImageKeys.map((key) =>
          imageStorageOrchestrator.resolveUrl(COVER_PROFILE_ID, key)
        ),
      };
    });
  }

  async saveStoreImages(input: SaveStoreImagesInput): Promise<StoreImagesData> {
    return traceServerLayer('server-service', 'ProfileService.saveStoreImages', async () => {
      if (!input.uid) throw new Error('userNotFound');

      const existing = await this.getProfileImageKeysQuery.execute(input.uid);
      const nextCoverImageKeys = input.coverImageKeys !== undefined
        ? normalizeCoverImageKeys(input.coverImageKeys)
        : input.coverImageKey !== undefined
        ? normalizeCoverImageKeys(input.coverImageKey ? [input.coverImageKey] : [])
        : normalizeCoverImageKeys(existing?.coverImageKeys ?? []);

      await this.upsertProfileImageKeysCommand.execute(input.uid, {
        avatarImageKey:
          input.avatarImageKey !== undefined ? input.avatarImageKey : (existing?.avatarImageKey ?? null),
        coverImageKey: nextCoverImageKeys[0] ?? null,
        coverImageKeys: nextCoverImageKeys,
      });

      return this.getStoreImages(input.uid);
    });
  }
}
