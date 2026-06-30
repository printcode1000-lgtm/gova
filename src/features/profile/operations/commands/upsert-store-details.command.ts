import 'server-only';

import type {
  SaveStoreDetailsInput,
  StoreDetailsData,
} from '../../entities/store-details.entity';
import type { IProfileRepository } from '../../repositories/profile-repository.interface';

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new Error('invalidStoreDetails');
  }
  return value.trim();
}

function normalizeStoreDetails(input: SaveStoreDetailsInput): StoreDetailsData {
  return {
    storeName: normalizeText(input.storeName, 120),
    storeDescription: normalizeText(input.storeDescription, 100),
    storeStory: normalizeText(input.storeStory, 1000),
  };
}

export class UpsertStoreDetailsCommand {
  constructor(private repository: IProfileRepository) {}

  async execute(input: SaveStoreDetailsInput): Promise<StoreDetailsData> {
    const details = normalizeStoreDetails(input);
    await this.repository.upsertStoreDetails(input.uid, details);
    return details;
  }
}
