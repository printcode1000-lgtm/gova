import * as React from "react";

import type {
  FavoriteItem,
  FavoriteItemInput,
  FavoriteTargetType,
} from "../domain/favorite.entity";

export interface FavoritesContextValue {
  items: FavoriteItem[];
  isLoading: boolean;
  totalCount: number;
  productCount: number;
  sellerCount: number;
  isFavorite: (type: FavoriteTargetType, targetId: string) => boolean;
  toggleFavorite: (input: FavoriteItemInput) => Promise<void>;
  removeFavorite: (type: FavoriteTargetType, targetId: string) => Promise<void>;
}

export const FavoritesContext = React.createContext<FavoritesContextValue | null>(null);
