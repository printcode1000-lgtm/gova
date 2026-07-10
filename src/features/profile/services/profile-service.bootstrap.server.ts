import "server-only";

import { ProfileService } from "./profile-service.server";
import {
  getProfileContactsQuery,
  upsertProfileContactsCommand,
  getProfileImageKeysQuery,
  upsertProfileImageKeysCommand,
  getStoreDetailsQuery,
  upsertStoreDetailsCommand,
  getProfileSpecialtiesQuery,
  upsertProfileSpecialtiesCommand,
  getUsersBySpecialtyQuery,
  getProfileFulfillmentSettingsQuery,
  upsertProfileFulfillmentSettingsCommand,
} from "../operations/instances";
import {
  getUserByUidQuery,
  updateUserProfileCommand,
} from "@/features/auth/operations/instances";

export const profileService = new ProfileService(
  getProfileContactsQuery,
  upsertProfileContactsCommand,
  getProfileImageKeysQuery,
  upsertProfileImageKeysCommand,
  getStoreDetailsQuery,
  upsertStoreDetailsCommand,
  getProfileSpecialtiesQuery,
  upsertProfileSpecialtiesCommand,
  getUsersBySpecialtyQuery,
  getProfileFulfillmentSettingsQuery,
  upsertProfileFulfillmentSettingsCommand,
  getUserByUidQuery,
  updateUserProfileCommand,
);
