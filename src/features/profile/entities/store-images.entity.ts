export interface StoreImagesData {
  avatarImageKey: string | null;
  coverImageKey: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
}

export interface SaveStoreImagesInput {
  uid: string;
  avatarImageKey?: string | null;
  coverImageKey?: string | null;
}
