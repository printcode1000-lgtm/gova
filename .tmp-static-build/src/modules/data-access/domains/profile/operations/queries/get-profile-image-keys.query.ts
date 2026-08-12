import 'server-only';

import type { IProfileRepository } from '@/modules/data-access/domains/profile/repositories/profile-repository.interface';

export class GetProfileImageKeysQuery {
  constructor(private repository: IProfileRepository) {}

  execute(uid: string) {
    return this.repository.getImageKeys(uid);
  }
}
