import type { ProfileContactsData } from '../entities/profile-contacts.entity';

export interface ProfileImageKeys {
  avatarImageKey: string | null;
  coverImageKey: string | null;
}

export interface IProfileRepository {
  getByUid(uid: string): Promise<ProfileContactsData | null>;
  upsert(uid: string, data: ProfileContactsData): Promise<void>;
  getImageKeys(uid: string): Promise<ProfileImageKeys | null>;
  upsertImageKeys(uid: string, keys: ProfileImageKeys): Promise<void>;
}
