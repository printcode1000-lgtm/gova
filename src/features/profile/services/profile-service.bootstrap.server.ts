import 'server-only';

import { ProfileService } from './profile-service.server';
import { getProfileContactsQuery, upsertProfileContactsCommand } from '../operations/instances';

export const profileService = new ProfileService(getProfileContactsQuery, upsertProfileContactsCommand);
