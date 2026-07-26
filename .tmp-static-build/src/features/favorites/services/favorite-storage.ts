import {
  ASOL_DB_STORES,
  asolDbDelete,
  asolDbGet,
  asolDbSet,
} from "@/lib/asol-db";

import type { FavoriteCollection } from "../entities/favorite.entity";
import {
  EMPTY_FAVORITE_COLLECTION,
  mergeFavoriteCollections,
  normalizeFavoriteCollection,
} from "./favorite-collection";

const GUEST_SCOPE = "guest";

function storageKey(scope: string): string {
  return `favorites:${scope}`;
}

export const favoriteStorage = {
  guestScope: GUEST_SCOPE,

  userScope(uid: string): string {
    return `user:${uid.trim()}`;
  },

  async read(scope: string): Promise<FavoriteCollection> {
    const value = await asolDbGet<unknown>(ASOL_DB_STORES.FAVORITES, storageKey(scope));
    return normalizeFavoriteCollection(value);
  },

  async write(scope: string, collection: FavoriteCollection): Promise<void> {
    await asolDbSet(ASOL_DB_STORES.FAVORITES, storageKey(scope), collection);
  },

  async mergeGuestIntoUser(uid: string): Promise<FavoriteCollection> {
    const userScope = this.userScope(uid);
    const [guest, user] = await Promise.all([
      this.read(GUEST_SCOPE),
      this.read(userScope),
    ]);
    if (guest.items.length === 0) return user;
    const merged = mergeFavoriteCollections(user, guest);
    await this.write(userScope, merged);
    await asolDbDelete(ASOL_DB_STORES.FAVORITES, storageKey(GUEST_SCOPE));
    return merged;
  },

  empty(): FavoriteCollection {
    return EMPTY_FAVORITE_COLLECTION;
  },
};
