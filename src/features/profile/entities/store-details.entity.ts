import type { ProfileRatingSettings } from "./profile-review.entity";

export interface StoreDetailsData {
  storeName: string;
  storeDescription: string;
  storeStory: string;
  ratingSettings: ProfileRatingSettings;
}

export const EMPTY_STORE_DETAILS: StoreDetailsData = {
  storeName: '',
  storeDescription: '',
  storeStory: '',
  ratingSettings: {
    enabled: true,
    mode: "stars-comments",
  },
};

export interface SaveStoreDetailsInput extends StoreDetailsData {
  uid: string;
}
