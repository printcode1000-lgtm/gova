import type { UserProfile } from "@/features/auth/entities/profile.entity";
import type { ProfileRegistrationSnapshot } from "@/features/profile/entities/profile-editor.entity";
import type { ProfileContactsData } from "@/features/profile/entities/profile-contacts.entity";
import type { StoreDetailsData } from "@/features/profile/entities/store-details.entity";
import type { ProfileSpecialtiesSelection } from "@/features/profile/entities/profile-specialties.entity";
import type { ProfileFulfillmentSettings } from "@/features/profile/entities/profile-fulfillment-settings.entity";

export interface ProfileSectionStatus {
  isDirty: boolean;
  isSaving: boolean;
  canSave: boolean;
  label: string;
}

export interface ProfileSectionController extends ProfileSectionStatus {
  save: () => Promise<boolean>;
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
