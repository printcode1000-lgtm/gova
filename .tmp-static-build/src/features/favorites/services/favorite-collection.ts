import {
  FAVORITE_TARGET_TYPES,
  favoriteKey,
  type FavoriteCollection,
  type FavoriteItem,
  type FavoriteItemInput,
  type FavoriteTargetType,
} from "../entities/favorite.entity";

export const EMPTY_FAVORITE_COLLECTION: FavoriteCollection = {
  schemaVersion: 1,
  items: [],
  updatedAt: "",
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isFavoriteType(value: unknown): value is FavoriteTargetType {
  return FAVORITE_TARGET_TYPES.includes(value as FavoriteTargetType);
}

export function normalizeFavoriteCollection(value: unknown): FavoriteCollection {
  if (!value || typeof value !== "object") return EMPTY_FAVORITE_COLLECTION;
  const source = value as { items?: unknown; updatedAt?: unknown };
  if (!Array.isArray(source.items)) return EMPTY_FAVORITE_COLLECTION;

  const byKey = new Map<string, FavoriteItem>();
  for (const candidate of source.items) {
    if (!candidate || typeof candidate !== "object") continue;
    const row = candidate as Record<string, unknown>;
    const type = row.type;
    const targetId = text(row.targetId);
    if (!isFavoriteType(type) || !targetId) continue;
    const key = favoriteKey(type, targetId);
    const savedAt = text(row.savedAt) || new Date(0).toISOString();
    byKey.set(key, {
      key,
      type,
      targetId,
      ownerUid: text(row.ownerUid),
      title: text(row.title) || targetId,
      subtitle: text(row.subtitle),
      imageUrl: text(row.imageUrl),
      priceText: text(row.priceText),
      ratingText: text(row.ratingText),
      href: text(row.href),
      savedAt,
      updatedAt: text(row.updatedAt) || savedAt,
    });
  }

  return {
    schemaVersion: 1,
    items: [...byKey.values()].sort((left, right) =>
      right.savedAt.localeCompare(left.savedAt),
    ),
    updatedAt: text(source.updatedAt),
  };
}

export function addFavorite(
  collection: FavoriteCollection,
  input: FavoriteItemInput,
  now = new Date().toISOString(),
): FavoriteCollection {
  const key = favoriteKey(input.type, input.targetId);
  const existing = collection.items.find((item) => item.key === key);
  const item: FavoriteItem = {
    ...input,
    key,
    savedAt: existing?.savedAt ?? now,
    updatedAt: now,
  };
  return {
    schemaVersion: 1,
    items: [item, ...collection.items.filter((entry) => entry.key !== key)].sort(
      (left, right) => right.savedAt.localeCompare(left.savedAt),
    ),
    updatedAt: now,
  };
}

export function restoreFavorite(
  collection: FavoriteCollection,
  item: FavoriteItem,
  now = new Date().toISOString(),
): FavoriteCollection {
  return {
    schemaVersion: 1,
    items: [
      { ...item, updatedAt: now },
      ...collection.items.filter((entry) => entry.key !== item.key),
    ].sort((left, right) => right.savedAt.localeCompare(left.savedAt)),
    updatedAt: now,
  };
}

export function removeFavorite(
  collection: FavoriteCollection,
  key: string,
  now = new Date().toISOString(),
): FavoriteCollection {
  return {
    schemaVersion: 1,
    items: collection.items.filter((item) => item.key !== key),
    updatedAt: now,
  };
}

export function mergeFavoriteCollections(
  current: FavoriteCollection,
  incoming: FavoriteCollection,
  now = new Date().toISOString(),
): FavoriteCollection {
  const byKey = new Map<string, FavoriteItem>();
  for (const item of [...incoming.items, ...current.items]) {
    const existing = byKey.get(item.key);
    if (!existing || item.updatedAt > existing.updatedAt) byKey.set(item.key, item);
  }
  return {
    schemaVersion: 1,
    items: [...byKey.values()].sort((left, right) =>
      right.savedAt.localeCompare(left.savedAt),
    ),
    updatedAt: now,
  };
}
