import type {
  ProfileContactsData,
  SaveProfileContactsInput,
} from "../../domain/profile-contacts.entity";
import type {
  SaveStoreImagesInput,
  StoreImagesData,
} from "../../domain/store-images.entity";
import type {
  SaveStoreDetailsInput,
  StoreDetailsData,
} from "../../domain/store-details.entity";
import type {
  SaveProfileEditorInput,
  SaveProfileEditorResult,
} from "../../domain/profile-editor.entity";
import type {
  ProfileSpecialtiesSelection,
  SaveProfileSpecialtiesInput,
} from "../../domain/profile-specialties.entity";
import type {
  ProfileFulfillmentSettings,
  SaveProfileFulfillmentSettingsInput,
} from "../../domain/profile-fulfillment-settings.entity";
import type { UserProfileRow } from "../../domain/user-profile-row.entity";
export type { UserProfileRow };


export interface IProfileService {
  getContacts(uid: string): Promise<ProfileContactsData>;
  saveContacts(input: SaveProfileContactsInput): Promise<ProfileContactsData>;
  getStoreImages(uid: string): Promise<StoreImagesData>;
  saveStoreImages(input: SaveStoreImagesInput): Promise<StoreImagesData>;
  getStoreDetails(uid: string): Promise<StoreDetailsData>;
  saveStoreDetails(input: SaveStoreDetailsInput): Promise<StoreDetailsData>;
  getFulfillmentSettings(uid: string): Promise<ProfileFulfillmentSettings>;
  saveFulfillmentSettings(
    input: SaveProfileFulfillmentSettingsInput,
  ): Promise<ProfileFulfillmentSettings>;
  getSpecialties(uid: string): Promise<ProfileSpecialtiesSelection>;
  saveSpecialties(
    input: SaveProfileSpecialtiesInput,
  ): Promise<ProfileSpecialtiesSelection>;
  saveEditor(input: SaveProfileEditorInput): Promise<SaveProfileEditorResult>;
  getUsersBySpecialty(
    categoryId: number,
    subcategoryId: number,
    offset: number,
    limit: number,
    search?: string,
    minRating?: number,
  ): Promise<UserProfileRow[]>;
}
