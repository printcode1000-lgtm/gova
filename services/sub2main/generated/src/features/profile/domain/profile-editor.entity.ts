import type { UserProfile } from "@/features/auth";
import type { ProfileRegistrationSnapshot } from "@asol/data-core/profile/entities";
import type { ProfileContactsData } from "./profile-contacts.entity";
import type { StoreDetailsData } from "./store-details.entity";
import type { ProfileSpecialtiesSelection } from "./profile-specialties.entity";

export type { ProfileRegistrationSnapshot };

export type ProfileEditorSection =
  | "registration"
  | "specialties"
  | "products"
  | "contact"
  | "store";

export interface SaveProfileEditorInput {
  uid: string;
  sessionToken: string;
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
