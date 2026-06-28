import type { ProfileContactsData, SaveProfileContactsInput } from '../entities/profile-contacts.entity';
import type { SaveStoreImagesInput, StoreImagesData } from '../entities/store-images.entity';

export interface IProfileService {
  getContacts(uid: string): Promise<ProfileContactsData>;
  saveContacts(input: SaveProfileContactsInput): Promise<ProfileContactsData>;
  getStoreImages(uid: string): Promise<StoreImagesData>;
  saveStoreImages(input: SaveStoreImagesInput): Promise<StoreImagesData>;
}
