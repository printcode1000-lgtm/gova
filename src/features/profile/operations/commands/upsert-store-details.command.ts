import 'server-only';

import type {
  ProfileShowcaseSettings,
  SaveStoreDetailsInput,
  StoreDetailsData,
} from '../../entities/store-details.entity';
import { EMPTY_PROFILE_SHOWCASE, EMPTY_STORE_DETAILS } from '../../entities/store-details.entity';
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

function normalizeProfileShowcase(value: unknown): ProfileShowcaseSettings {
  if (!value || typeof value !== 'object') return EMPTY_PROFILE_SHOWCASE;
  const showcase = value as Partial<ProfileShowcaseSettings>;
  const trending =
    showcase.trending && typeof showcase.trending === 'object'
      ? showcase.trending
      : EMPTY_PROFILE_SHOWCASE.trending;
  const trendingValue = trending as { label?: unknown; items?: unknown };
  return {
    featuredProductIds: Array.isArray(showcase.featuredProductIds)
      ? Array.from(
          new Set(
            showcase.featuredProductIds
              .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
              .map((id) => id.trim()),
          ),
        ).slice(0, 20)
      : [],
    trending: {
      label:
        typeof trendingValue.label === 'string' && trendingValue.label.trim()
          ? normalizeText(trendingValue.label, 80)
          : EMPTY_PROFILE_SHOWCASE.trending.label,
      items: Array.isArray(trendingValue.items)
        ? trendingValue.items
            .map((item, index) => {
              const row = item as { id?: unknown; label?: unknown };
              if (typeof row.label !== 'string') return null;
              const label = normalizeText(row.label, 80);
              if (!label) return null;
              return {
                id:
                  typeof row.id === 'string' && row.id.trim()
                    ? row.id.trim()
                    : `trending-${index}`,
                label,
              };
            })
            .filter((item): item is { id: string; label: string } => Boolean(item))
            .slice(0, 20)
        : [],
    },
    customRequestEnabled:
      typeof showcase.customRequestEnabled === 'boolean'
        ? showcase.customRequestEnabled
        : EMPTY_PROFILE_SHOWCASE.customRequestEnabled,
  };
}

function normalizeStoreDetails(input: SaveStoreDetailsInput): StoreDetailsData {
  return {
    storeName: normalizeText(input.storeName, 120),
    storeDescription: normalizeText(input.storeDescription, 100),
    storeStory: normalizeText(input.storeStory, 1000),
    ratingSettings: normalizeRatingSettings(input.ratingSettings),
    profileShowcase: normalizeProfileShowcase(input.profileShowcase),
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
