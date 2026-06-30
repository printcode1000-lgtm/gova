import type {
  ProfileContactsData,
  SaveProfileContactsInput,
} from '../entities/profile-contacts.entity';
import type {
  SaveStoreImagesInput,
  StoreImagesData,
} from '../entities/store-images.entity';
import type {
  SaveStoreDetailsInput,
  StoreDetailsData,
} from '../entities/store-details.entity';
import type {
  SaveProfileEditorInput,
  SaveProfileEditorResult,
} from '../entities/profile-editor.entity';

export interface IProfileService {
  getContacts(uid: string): Promise<ProfileContactsData>;
  saveContacts(input: SaveProfileContactsInput): Promise<ProfileContactsData>;
  getStoreImages(uid: string): Promise<StoreImagesData>;
  saveStoreImages(input: SaveStoreImagesInput): Promise<StoreImagesData>;
  getStoreDetails(uid: string): Promise<StoreDetailsData>;
  saveStoreDetails(input: SaveStoreDetailsInput): Promise<StoreDetailsData>;
  saveEditor(input: SaveProfileEditorInput): Promise<SaveProfileEditorResult>;
}
