export const FAVORITE_TARGET_TYPES = ["product", "seller"] as const;

export type FavoriteTargetType = (typeof FAVORITE_TARGET_TYPES)[number];

export interface FavoriteItem {
  key: string;
  type: FavoriteTargetType;
  targetId: string;
  ownerUid: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  priceText: string;
  ratingText: string;
  href: string;
  savedAt: string;
  updatedAt: string;
}

export type FavoriteItemInput = Omit<
  FavoriteItem,
  "key" | "savedAt" | "updatedAt"
>;

export interface FavoriteCollection {
  schemaVersion: 1;
  items: FavoriteItem[];
  updatedAt: string;
}

export function favoriteKey(type: FavoriteTargetType, targetId: string): string {
  return `${type}:${targetId.trim()}`;
}
