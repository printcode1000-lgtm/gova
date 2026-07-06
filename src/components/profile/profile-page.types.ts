import type {
  ProfileContactsController,
  ProfileRegistrationController,
  ProfileSectionStatus,
  ProfileSpecialtiesController,
  StoreDetailsController,
} from "./profile-save-controller";

export type ProfileEditTab = "registration" | "specialties" | "products" | "contact" | "store";

export const PROFILE_SECTION_IDS: Record<ProfileEditTab, string> = {
  registration: "profile-registration-panel",
  specialties: "profile-specialties-panel",
  products: "profile-products-panel",
  contact: "profile-contact-panel",
  store: "profile-store-panel",
};

export const PROFILE_SECTIONS: ProfileEditTab[] = [
  "registration",
  "specialties",
  "products",
  "contact",
  "store",
];

export type { ProfileSectionStatus };
