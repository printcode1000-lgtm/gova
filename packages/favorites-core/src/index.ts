export type {
  FavoriteCollection,
  FavoriteItem,
  FavoriteItemInput,
  FavoriteTargetType,
} from "./domain/favorite.entity";
export { favoriteKey } from "./domain/favorite.entity";
export {
  favoriteFromProductCard,
  favoriteFromSellerCard,
  productCardFromFavorite,
  sellerCardFromFavorite,
} from "./application/favorite-card-adapter";
