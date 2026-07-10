import 'server-only';

import type {
  SaveStoreDetailsInput,
  StoreDetailsData,
} from '../../entities/store-details.entity';
import { EMPTY_STORE_DETAILS } from '../../entities/store-details.entity';
import type { ProfileRatingSettings } from '../../entities/profile-review.entity';
import type { IProfileRepository } from '../../repositories/profile-repository.interface';

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new Error('invalidStoreDetails');
  }
  return value.trim();
}

function normalizeRatingSettings(value: unknown): ProfileRatingSettings {
  if (!value || typeof value !== 'object') {
    return EMPTY_STORE_DETAILS.ratingSettings;
  }
  const settings = value as Partial<ProfileRatingSettings>;
  return {
    enabled:
      typeof settings.enabled === 'boolean'
        ? settings.enabled
        : EMPTY_STORE_DETAILS.ratingSettings.enabled,
    mode:
      settings.mode === 'stars' || settings.mode === 'stars-comments'
        ? settings.mode
        : EMPTY_STORE_DETAILS.ratingSettings.mode,
  };
}

function normalizeStoreDetails(input: SaveStoreDetailsInput): StoreDetailsData {
  return {
    storeName: normalizeText(input.storeName, 120),
    storeDescription: normalizeText(input.storeDescription, 100),
    storeStory: normalizeText(input.storeStory, 1000),
    ratingSettings: normalizeRatingSettings(input.ratingSettings),
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
