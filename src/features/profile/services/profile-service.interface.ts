import type { ProfileContactsData, SaveProfileContactsInput } from '../entities/profile-contacts.entity';

export interface IProfileService {
  getContacts(uid: string): Promise<ProfileContactsData>;
  saveContacts(input: SaveProfileContactsInput): Promise<ProfileContactsData>;
}
