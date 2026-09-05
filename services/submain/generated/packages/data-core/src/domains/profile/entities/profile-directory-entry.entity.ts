/** Public profile-search shape. Persistence-only search/normalized columns never leave data-core. */
export interface ProfileDirectoryEntry {
  uid: string;
  storeName: string;
  storeDescription: string;
  storeStory: string;
  customRequestEnabled: boolean;
  trendingLabel: string;
  primaryPhone: string;
  ratingAverage: number;
  ratingCount: number;
}
