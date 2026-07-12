import type { ProfileRatingSettings } from "./profile-review.entity";

export interface ProfileShowcaseTrendingItem {
  id: string;
  label: string;
}

export interface ProfileShowcaseSettings {
  featuredProductIds: string[];
  trending: {
    label: string;
    items: ProfileShowcaseTrendingItem[];
  };
  customRequestEnabled: boolean;
}

export interface StoreDetailsData {
  storeName: string;
  storeDescription: string;
  storeStory: string;
  ratingSettings: ProfileRatingSettings;
  profileShowcase: ProfileShowcaseSettings;
}

export const EMPTY_PROFILE_SHOWCASE: ProfileShowcaseSettings = {
  featuredProductIds: [],
  trending: {
    label: "الأكثر رواجًا",
    items: [],
  },
  customRequestEnabled: true,
};

export const EMPTY_STORE_DETAILS: StoreDetailsData = {
  storeName: '',
  storeDescription: '',
  storeStory: '',
  ratingSettings: {
    enabled: true,
    mode: "stars-comments",
  },
  profileShowcase: EMPTY_PROFILE_SHOWCASE,
};

export interface SaveStoreDetailsInput extends StoreDetailsData {
  uid: string;
}
