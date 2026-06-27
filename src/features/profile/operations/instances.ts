import 'server-only';

import { profileRepository } from '../repositories/profile-repository';
import { GetProfileContactsQuery } from './queries/get-profile-contacts.query';
import { UpsertProfileContactsCommand } from './commands/upsert-profile-contacts.command';

export const getProfileContactsQuery = new GetProfileContactsQuery(profileRepository);
export const upsertProfileContactsCommand = new UpsertProfileContactsCommand(profileRepository);
