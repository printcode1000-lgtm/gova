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
} from "@asol/data-core/profile";
import { getUserByUidQuery } from "@asol/data-core/auth";

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
);
