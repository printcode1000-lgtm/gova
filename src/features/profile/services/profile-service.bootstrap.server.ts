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
} from "@/modules/data-access/domains/profile/operations/instances";
import { getUserByUidQuery } from "@/modules/data-access/domains/auth/operations/instances";

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
