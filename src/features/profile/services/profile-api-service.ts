import { govaApi, GOVA_API_ROUTES } from "@/core/api";
import type { ReviewSort } from "@/features/product/entities/product-review.entity";
import type {
  ProfileReview,
  ProfileReviewsResult,
  SaveProfileReviewInput,
  UpdateProfileReviewInput,
} from "../entities/profile-review.entity";
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
import type {
  ProfileFulfillmentSettings,
  SaveProfileFulfillmentSettingsInput,
} from "../entities/profile-fulfillment-settings.entity";
import type { UserProfileRow } from "./profile-service.interface";

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
    return govaApi.get<ProfileSpecialtiesSelection>(route, {
      cache: "no-store",
      suppressErrorLog: true,
    });
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
    search?: string,
  ): Promise<UserProfileRow[]> {
    const q = new URLSearchParams({
      categoryId: String(categoryId),
      subcategoryId: String(subcategoryId),
      offset: String(offset),
      limit: String(limit),
    });
    if (search?.trim()) q.set("search", search.trim());
    const route = `${GOVA_API_ROUTES.profile.usersBySpecialty}?${q}`;
    return govaApi.get<UserProfileRow[]>(route);
  }

  async getFulfillmentSettings(
    uid: string,
  ): Promise<ProfileFulfillmentSettings> {
    const route = `${GOVA_API_ROUTES.profile.fulfillmentSettings}?uid=${encodeURIComponent(uid)}`;
    return govaApi.get<ProfileFulfillmentSettings>(route);
  }

  async saveFulfillmentSettings(
    input: SaveProfileFulfillmentSettingsInput,
  ): Promise<ProfileFulfillmentSettings> {
    return govaApi.put<ProfileFulfillmentSettings>(
      GOVA_API_ROUTES.profile.fulfillmentSettings,
      input,
    );
  }

  async saveEditor(
    input: SaveProfileEditorInput,
  ): Promise<SaveProfileEditorResult> {
    return govaApi.put<SaveProfileEditorResult>(
      GOVA_API_ROUTES.profile.editor,
      input,
    );
  }

  async listReviews(
    targetUid: string,
    sort: ReviewSort,
    offset: number,
    limit: number,
    uid: string,
  ): Promise<ProfileReviewsResult> {
    const q = new URLSearchParams({
      targetUid,
      sort,
      offset: String(offset),
      limit: String(limit),
      uid,
    });
    return govaApi.get<ProfileReviewsResult>(
      `${GOVA_API_ROUTES.profile.reviews.root}?${q}`,
      { cache: "no-store" },
    );
  }

  async createReview(input: SaveProfileReviewInput): Promise<ProfileReview> {
    return govaApi.post<ProfileReview>(
      GOVA_API_ROUTES.profile.reviews.root,
      input,
    );
  }

  async updateReview(input: UpdateProfileReviewInput): Promise<ProfileReview> {
    return govaApi.put<ProfileReview>(
      GOVA_API_ROUTES.profile.reviews.root,
      input,
    );
  }

  async deleteReview(reviewId: string, uid: string): Promise<{ deleted: boolean }> {
    const q = new URLSearchParams({ reviewId, uid });
    return govaApi.delete<{ deleted: boolean }>(
      `${GOVA_API_ROUTES.profile.reviews.root}?${q}`,
    );
  }

  async helpfulReview(reviewId: string, uid: string): Promise<ProfileReview> {
    return govaApi.post<ProfileReview>(GOVA_API_ROUTES.profile.reviews.helpful, {
      reviewId,
      uid,
    });
  }

  async replyReview(
    reviewId: string,
    uid: string,
    text: string,
  ): Promise<ProfileReview> {
    return govaApi.post<ProfileReview>(GOVA_API_ROUTES.profile.reviews.reply, {
      reviewId,
      uid,
      text,
    });
  }

  async deleteReplyReview(
    reviewId: string,
    uid: string,
  ): Promise<{ deleted: boolean }> {
    const q = new URLSearchParams({ reviewId, uid });
    return govaApi.delete<{ deleted: boolean }>(
      `${GOVA_API_ROUTES.profile.reviews.reply}?${q}`,
    );
  }
}

export const profileApiService = new ProfileApiService();
