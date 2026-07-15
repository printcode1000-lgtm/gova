import { asolApi, ASOL_API_ROUTES } from "@/core/api";
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
    const route = `${ASOL_API_ROUTES.profile.contacts}?uid=${encodeURIComponent(uid)}`;
    return asolApi.get<ProfileContactsData>(route);
  }

  async saveContacts(
    input: SaveProfileContactsInput,
  ): Promise<ProfileContactsData> {
    return asolApi.put<ProfileContactsData>(
      ASOL_API_ROUTES.profile.contacts,
      input,
    );
  }

  async getStoreImages(uid: string): Promise<StoreImagesData> {
    const route = `${ASOL_API_ROUTES.profile.storeImages}?uid=${encodeURIComponent(uid)}`;
    return asolApi.get<StoreImagesData>(route);
  }

  async saveStoreImages(input: SaveStoreImagesInput): Promise<StoreImagesData> {
    return asolApi.put<StoreImagesData>(
      ASOL_API_ROUTES.profile.storeImages,
      input,
    );
  }

  async getStoreDetails(uid: string): Promise<StoreDetailsData> {
    const route = `${ASOL_API_ROUTES.profile.storeDetails}?uid=${encodeURIComponent(uid)}`;
    return asolApi.get<StoreDetailsData>(route);
  }

  async saveStoreDetails(
    input: SaveStoreDetailsInput,
  ): Promise<StoreDetailsData> {
    return asolApi.put<StoreDetailsData>(
      ASOL_API_ROUTES.profile.storeDetails,
      input,
    );
  }

  async getSpecialties(uid: string): Promise<ProfileSpecialtiesSelection> {
    const route = `${ASOL_API_ROUTES.profile.specialties}?uid=${encodeURIComponent(uid)}`;
    return asolApi.get<ProfileSpecialtiesSelection>(route, {
      cache: "no-store",
      suppressErrorLog: true,
    });
  }

  async saveSpecialties(
    input: SaveProfileSpecialtiesInput,
  ): Promise<ProfileSpecialtiesSelection> {
    return asolApi.put<ProfileSpecialtiesSelection>(
      ASOL_API_ROUTES.profile.specialties,
      input,
    );
  }

  async getUsersBySpecialty(
    categoryId: number,
    subcategoryId: number,
    offset: number,
    limit: number,
    search?: string,
    minRating?: number,
  ): Promise<UserProfileRow[]> {
    const q = new URLSearchParams({
      categoryId: String(categoryId),
      subcategoryId: String(subcategoryId),
      offset: String(offset),
      limit: String(limit),
    });
    if (search?.trim()) q.set("search", search.trim());
    if (typeof minRating === "number" && Number.isFinite(minRating)) {
      q.set("minRating", String(minRating));
    }
    const route = `${ASOL_API_ROUTES.profile.usersBySpecialty}?${q}`;
    return asolApi.get<UserProfileRow[]>(route);
  }

  async getFulfillmentSettings(
    uid: string,
  ): Promise<ProfileFulfillmentSettings> {
    const route = `${ASOL_API_ROUTES.profile.fulfillmentSettings}?uid=${encodeURIComponent(uid)}`;
    return asolApi.get<ProfileFulfillmentSettings>(route);
  }

  async saveFulfillmentSettings(
    input: SaveProfileFulfillmentSettingsInput,
  ): Promise<ProfileFulfillmentSettings> {
    return asolApi.put<ProfileFulfillmentSettings>(
      ASOL_API_ROUTES.profile.fulfillmentSettings,
      input,
    );
  }

  async saveEditor(
    input: SaveProfileEditorInput,
  ): Promise<SaveProfileEditorResult> {
    return asolApi.put<SaveProfileEditorResult>(
      ASOL_API_ROUTES.profile.editor,
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
    return asolApi.get<ProfileReviewsResult>(
      `${ASOL_API_ROUTES.profile.reviews.root}?${q}`,
      { cache: "no-store" },
    );
  }

  async createReview(input: SaveProfileReviewInput): Promise<ProfileReview> {
    return asolApi.post<ProfileReview>(
      ASOL_API_ROUTES.profile.reviews.root,
      input,
    );
  }

  async updateReview(input: UpdateProfileReviewInput): Promise<ProfileReview> {
    return asolApi.put<ProfileReview>(
      ASOL_API_ROUTES.profile.reviews.root,
      input,
    );
  }

  async deleteReview(reviewId: string, uid: string): Promise<{ deleted: boolean }> {
    const q = new URLSearchParams({ reviewId, uid });
    return asolApi.delete<{ deleted: boolean }>(
      `${ASOL_API_ROUTES.profile.reviews.root}?${q}`,
    );
  }

  async helpfulReview(reviewId: string, uid: string): Promise<ProfileReview> {
    return asolApi.post<ProfileReview>(ASOL_API_ROUTES.profile.reviews.helpful, {
      reviewId,
      uid,
    });
  }

  async replyReview(
    reviewId: string,
    uid: string,
    text: string,
  ): Promise<ProfileReview> {
    return asolApi.post<ProfileReview>(ASOL_API_ROUTES.profile.reviews.reply, {
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
    return asolApi.delete<{ deleted: boolean }>(
      `${ASOL_API_ROUTES.profile.reviews.reply}?${q}`,
    );
  }
}

export const profileApiService = new ProfileApiService();
