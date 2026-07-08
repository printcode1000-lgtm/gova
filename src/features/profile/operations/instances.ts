import "server-only";

import { profileRepository } from "../repositories/profile-repository";
import { GetProfileContactsQuery } from "./queries/get-profile-contacts.query";
import { UpsertProfileContactsCommand } from "./commands/upsert-profile-contacts.command";
import { GetProfileImageKeysQuery } from "./queries/get-profile-image-keys.query";
import { UpsertProfileImageKeysCommand } from "./commands/upsert-profile-image-keys.command";
import { GetStoreDetailsQuery } from "./queries/get-store-details.query";
import { UpsertStoreDetailsCommand } from "./commands/upsert-store-details.command";
import { GetProfileSpecialtiesQuery } from "./queries/get-profile-specialties.query";
import { UpsertProfileSpecialtiesCommand } from "./commands/upsert-profile-specialties.command";
import { GetUsersBySpecialtyQuery } from "./queries/get-users-by-specialty.query";

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
