import 'server-only';

import type { IProfileRepository, ProfileImageKeys } from '@/modules/data-access/domains/profile/repositories/profile-repository.interface';

export class UpsertProfileImageKeysCommand {
  constructor(private repository: IProfileRepository) {}

  execute(uid: string, keys: ProfileImageKeys) {
    return this.repository.upsertImageKeys(uid, keys);
  }
}
