export interface StoreImagesData {
  avatarImageKey: string | null;
  coverImageKeys: string[];
  avatarUrl: string | null;
  coverUrl: string | null;
  coverUrls: string[];
}

export interface SaveStoreImagesInput {
  uid: string;
  avatarImageKey?: string | null;
  coverImageKeys?: string[];
}
