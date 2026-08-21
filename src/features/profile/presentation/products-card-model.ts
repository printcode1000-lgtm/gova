import type { ProfileShowcaseSettings } from '@/features/profile/entities/store-details.entity';

export function cloneShowcase(showcase: ProfileShowcaseSettings): ProfileShowcaseSettings {
  return {
    featuredProductIds: [...showcase.featuredProductIds],
    trending: {
      label: showcase.trending.label,
      items: showcase.trending.items.map((item) => ({ ...item })),
    },
    customRequestEnabled: showcase.customRequestEnabled,
  };
}

export function isShowcaseDirty(
  current: ProfileShowcaseSettings,
  baseline: ProfileShowcaseSettings,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(baseline);
}
