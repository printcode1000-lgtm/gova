import "server-only";

import { profileRepository } from "@/modules/data-access/domains/profile/repositories/profile-repository";
import { GetProfileContactsQuery } from "@/modules/data-access/domains/profile/operations/queries/get-profile-contacts.query";
import { UpsertProfileContactsCommand } from "@/modules/data-access/domains/profile/operations/commands/upsert-profile-contacts.command";
import { GetProfileImageKeysQuery } from "@/modules/data-access/domains/profile/operations/queries/get-profile-image-keys.query";
import { UpsertProfileImageKeysCommand } from "@/modules/data-access/domains/profile/operations/commands/upsert-profile-image-keys.command";
import { GetStoreDetailsQuery } from "@/modules/data-access/domains/profile/operations/queries/get-store-details.query";
import { UpsertStoreDetailsCommand } from "@/modules/data-access/domains/profile/operations/commands/upsert-store-details.command";
import { GetProfileSpecialtiesQuery } from "@/modules/data-access/domains/profile/operations/queries/get-profile-specialties.query";
import { UpsertProfileSpecialtiesCommand } from "@/modules/data-access/domains/profile/operations/commands/upsert-profile-specialties.command";
import { GetUsersBySpecialtyQuery } from "@/modules/data-access/domains/profile/operations/queries/get-users-by-specialty.query";
import { GetProfileFulfillmentSettingsQuery } from "@/modules/data-access/domains/profile/operations/queries/get-profile-fulfillment-settings.query";
import { UpsertProfileFulfillmentSettingsCommand } from "@/modules/data-access/domains/profile/operations/commands/upsert-profile-fulfillment-settings.command";

export const getProfileContactsQuery = new GetProfileContactsQuery(
  profileRepository,
);
export const upsertProfileContactsCommand = new UpsertProfileContactsCommand(
  profileRepository,
);
export const getProfileImageKeysQuery = new GetProfileImageKeysQuery(
  profileRepository,
);
export const upsertProfileImageKeysCommand = new UpsertProfileImageKeysCommand(
  profileRepository,
);
export const getStoreDetailsQuery = new GetStoreDetailsQuery(profileRepository);
export const upsertStoreDetailsCommand = new UpsertStoreDetailsCommand(
  profileRepository,
);
export const getProfileSpecialtiesQuery = new GetProfileSpecialtiesQuery(
  profileRepository,
);
export const upsertProfileSpecialtiesCommand =
  new UpsertProfileSpecialtiesCommand(profileRepository);
export const getUsersBySpecialtyQuery = new GetUsersBySpecialtyQuery(
  profileRepository,
);
export const getProfileFulfillmentSettingsQuery =
  new GetProfileFulfillmentSettingsQuery(profileRepository);
export const upsertProfileFulfillmentSettingsCommand =
  new UpsertProfileFulfillmentSettingsCommand(profileRepository);
