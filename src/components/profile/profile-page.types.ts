import type {
  ProfileContactsController,
  ProfileRegistrationController,
  ProfileSectionStatus,
  ProfileSpecialtiesController,
  ProfileFulfillmentController,
  StoreDetailsController,
} from "./profile-save-controller";

export type ProfileEditTab =
  | "registration"
  | "specialties"
  | "products"
  | "contact"
  | "store"
  | "workingHours"
  | "fulfillment";

export const PROFILE_SECTION_IDS: Record<ProfileEditTab, string> = {
  registration: "profile-registration-panel",
  specialties: "profile-specialties-panel",
  products: "profile-products-panel",
  contact: "profile-contact-panel",
  store: "profile-store-panel",
  workingHours: "profile-working-hours-panel",
  fulfillment: "profile-fulfillment-panel",
};

export const PROFILE_SECTIONS: ProfileEditTab[] = [
  "registration",
  "specialties",
  "products",
  "contact",
  "store",
  "workingHours",
  "fulfillment",
];

export type { ProfileSectionStatus };
