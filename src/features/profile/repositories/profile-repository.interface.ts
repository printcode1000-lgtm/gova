import type { ProfileContactsData } from '../entities/profile-contacts.entity';

export interface IProfileRepository {
  getByUid(uid: string): Promise<ProfileContactsData | null>;
  upsert(uid: string, data: ProfileContactsData): Promise<void>;
}
