export type {
  FavoriteCollection,
  FavoriteItem,
  FavoriteItemInput,
  FavoriteTargetType,
} from "./entities/favorite.entity";
export { favoriteKey } from "./entities/favorite.entity";
export { FavoriteButton } from "./components/FavoriteButton";
export { FavoritesProvider, useFavorites } from "./hooks/FavoritesProvider";
export {
  favoriteFromProductCard,
  favoriteFromSellerCard,
  productCardFromFavorite,
  sellerCardFromFavorite,
} from "./services/favorite-card-adapter";
