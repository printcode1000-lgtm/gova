import { govaApi, GOVA_API_ROUTES } from "@/core/api";
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
import type { IProfileService } from "./profile-service.interface";
import type {
  SaveProfileEditorInput,
  SaveProfileEditorResult,
} from "../entities/profile-editor.entity";
import type {
  ProfileSpecialtiesSelection,
  SaveProfileSpecialtiesInput,
} from "../entities/profile-specialties.entity";
import type { UserProfileRow } from "@/core/database/profile/profile.schema";

export class ProfileApiService implements IProfileService {
  async getContacts(uid: string): Promise<ProfileContactsData> {
    const route = `${GOVA_API_ROUTES.profile.contacts}?uid=${encodeURIComponent(uid)}`;
    return govaApi.get<ProfileContactsData>(route);
  }

  async saveContacts(
    input: SaveProfileContactsInput,
  ): Promise<ProfileContactsData> {
    return govaApi.put<ProfileContactsData>(
      GOVA_API_ROUTES.profile.contacts,
      input,
    );
  }

  async getStoreImages(uid: string): Promise<StoreImagesData> {
    const route = `${GOVA_API_ROUTES.profile.storeImages}?uid=${encodeURIComponent(uid)}`;
    return govaApi.get<StoreImagesData>(route);
  }

  async saveStoreImages(input: SaveStoreImagesInput): Promise<StoreImagesData> {
    return govaApi.put<StoreImagesData>(
      GOVA_API_ROUTES.profile.storeImages,
      input,
    );
  }

  async getStoreDetails(uid: string): Promise<StoreDetailsData> {
    const route = `${GOVA_API_ROUTES.profile.storeDetails}?uid=${encodeURIComponent(uid)}`;
    return govaApi.get<StoreDetailsData>(route);
  }

  async saveStoreDetails(
    input: SaveStoreDetailsInput,
  ): Promise<StoreDetailsData> {
    return govaApi.put<StoreDetailsData>(
      GOVA_API_ROUTES.profile.storeDetails,
      input,
    );
  }

  async getSpecialties(uid: string): Promise<ProfileSpecialtiesSelection> {
    const route = `${GOVA_API_ROUTES.profile.specialties}?uid=${encodeURIComponent(uid)}`;
    return govaApi.get<ProfileSpecialtiesSelection>(route);
  }

  async saveSpecialties(
    input: SaveProfileSpecialtiesInput,
  ): Promise<ProfileSpecialtiesSelection> {
    return govaApi.put<ProfileSpecialtiesSelection>(
      GOVA_API_ROUTES.profile.specialties,
      input,
    );
  }

  async getUsersBySpecialty(
    categoryId: number,
    subcategoryId: number,
    offset: number,
    limit: number,
  ): Promise<UserProfileRow[]> {
    const route = `${GOVA_API_ROUTES.profile.usersBySpecialty}?categoryId=${categoryId}&subcategoryId=${subcategoryId}&offset=${offset}&limit=${limit}`;
    return govaApi.get<UserProfileRow[]>(route);
  }

  async saveEditor(
    input: SaveProfileEditorInput,
  ): Promise<SaveProfileEditorResult> {
    return govaApi.put<SaveProfileEditorResult>(
      GOVA_API_ROUTES.profile.editor,
      input,
    );
  }
}

export const profileApiService = new ProfileApiService();
