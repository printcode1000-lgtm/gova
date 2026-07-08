import type {
  ProfileContactsData,
  SaveProfileContactsInput,
} from "../entities/profile-contacts.entity";
import type {
  SaveStoreImagesInput,
  StoreImagesData,
} from "../entities/store-images.entity";
import type {
  SaveStoreDetailsInput,
  StoreDetailsData,
} from "../entities/store-details.entity";
import type {
  SaveProfileEditorInput,
  SaveProfileEditorResult,
} from "../entities/profile-editor.entity";
import type {
  ProfileSpecialtiesSelection,
  SaveProfileSpecialtiesInput,
} from "../entities/profile-specialties.entity";
import type { UserProfileRow } from "@/core/database/profile/profile.schema";
export type { UserProfileRow };


export interface IProfileService {
  getContacts(uid: string): Promise<ProfileContactsData>;
  saveContacts(input: SaveProfileContactsInput): Promise<ProfileContactsData>;
  getStoreImages(uid: string): Promise<StoreImagesData>;
  saveStoreImages(input: SaveStoreImagesInput): Promise<StoreImagesData>;
  getStoreDetails(uid: string): Promise<StoreDetailsData>;
  saveStoreDetails(input: SaveStoreDetailsInput): Promise<StoreDetailsData>;
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
  ): Promise<UserProfileRow[]>;
}
