export type {
  FavoriteCollection,
  FavoriteItem,
  FavoriteItemInput,
  FavoriteTargetType,
} from './domain/favorite.entity';
export { favoriteKey } from './domain/favorite.entity';
export { FavoriteButton } from './presentation/FavoriteButton';
export { FavoritesProvider, useFavorites } from "./presentation/hooks/FavoritesProvider";
export {
  favoriteFromProductCard,
  favoriteFromSellerCard,
  productCardFromFavorite,
  sellerCardFromFavorite,
} from "./application/services/favorite-card-adapter";
