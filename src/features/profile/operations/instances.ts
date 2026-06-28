import 'server-only';

import { profileRepository } from '../repositories/profile-repository';
import { GetProfileContactsQuery } from './queries/get-profile-contacts.query';
import { UpsertProfileContactsCommand } from './commands/upsert-profile-contacts.command';
import { GetProfileImageKeysQuery } from './queries/get-profile-image-keys.query';
import { UpsertProfileImageKeysCommand } from './commands/upsert-profile-image-keys.command';

export const getProfileContactsQuery = new GetProfileContactsQuery(profileRepository);
export const upsertProfileContactsCommand = new UpsertProfileContactsCommand(profileRepository);
export const getProfileImageKeysQuery = new GetProfileImageKeysQuery(profileRepository);
export const upsertProfileImageKeysCommand = new UpsertProfileImageKeysCommand(profileRepository);
