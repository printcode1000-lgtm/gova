import 'server-only';

import {
  EMPTY_STORE_DETAILS,
  type StoreDetailsData,
} from '../../entities/store-details.entity';
import type { IProfileRepository } from '../../repositories/profile-repository.interface';

export class GetStoreDetailsQuery {
  constructor(private repository: IProfileRepository) {}

  async execute(uid: string): Promise<StoreDetailsData> {
    return (await this.repository.getStoreDetails(uid)) ?? EMPTY_STORE_DETAILS;
  }
}
