import type { UserProfile } from "@/features/auth";
import type { ProfileRegistrationSnapshot } from "@/features/profile/domain/profile-editor.entity";
import type { ProfileContactsData } from "@/features/profile/domain/profile-contacts.entity";
import type { StoreDetailsData } from "@/features/profile/domain/store-details.entity";
import type { ProfileSpecialtiesSelection } from "@/features/profile/domain/profile-specialties.entity";
import type { ProfileFulfillmentSettings } from "@/features/profile/domain/profile-fulfillment-settings.entity";
import type { SellerDiscountRule } from "@/features/seller-discounts";

export interface ProfileSectionStatus {
  isDirty: boolean;
  isSaving: boolean;
  canSave: boolean;
  label: string;
  description?: string;
}

export interface ProfileSectionController extends ProfileSectionStatus {
  save: () => Promise<boolean>;
  prepareForSave?: () => Promise<boolean>;
}

export interface ProfileRegistrationController extends ProfileSectionController {
  prepareSnapshot: () => ProfileRegistrationSnapshot | null;
  applySaved: (profile: UserProfile) => Promise<void>;
}

export interface ProfileContactsController extends ProfileSectionController {
  getSnapshot: () => ProfileContactsData;
  applySaved: (contacts: ProfileContactsData) => void;
}

export interface StoreDetailsController extends ProfileSectionController {
  getSnapshot: () => StoreDetailsData;
  applySaved: (details: StoreDetailsData) => void;
}

export interface ProfileFulfillmentController extends ProfileSectionController {
  getSnapshot: () => ProfileFulfillmentSettings;
  applySaved: (settings: ProfileFulfillmentSettings) => void;
}

export interface ProfileSpecialtiesController extends ProfileSectionController {
  getSnapshot: () => ProfileSpecialtiesSelection;
  applySaved: (specialties: ProfileSpecialtiesSelection) => void;
  getStoreDetailsSnapshot?: () => StoreDetailsData;
  applyStoreDetailsSaved?: (details: StoreDetailsData) => void;
}

export interface ProfileDiscountsController extends ProfileSectionController {
  getSnapshot: () => SellerDiscountRule[];
  applySaved: (discounts: SellerDiscountRule[]) => void;
}
