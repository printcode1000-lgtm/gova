import type { UserProfile } from "@/features/auth/entities/profile.entity";
import type { ProfileContactsData } from "./profile-contacts.entity";
import type { StoreDetailsData } from "./store-details.entity";
import type { ProfileSpecialtiesSelection } from "./profile-specialties.entity";

export type ProfileEditorSection =
  | "registration"
  | "specialties"
  | "contact"
  | "store";

export interface ProfileRegistrationSnapshot {
  phone: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  phoneVerified: boolean;
}

export interface SaveProfileEditorInput {
  uid: string;
  changedSections: ProfileEditorSection[];
  registration: ProfileRegistrationSnapshot;
  contacts: ProfileContactsData;
  storeDetails: StoreDetailsData;
  specialties: ProfileSpecialtiesSelection;
}

export interface SaveProfileEditorResult {
  registration: UserProfile;
  contacts: ProfileContactsData;
  storeDetails: StoreDetailsData;
  specialties: ProfileSpecialtiesSelection;
}
