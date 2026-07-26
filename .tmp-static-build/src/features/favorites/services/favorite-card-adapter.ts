import type { ProductCardViewModel } from "@/features/product-card";
import type { SellerCardViewModel } from "@/features/seller-card";

import type { FavoriteItem, FavoriteItemInput } from "../entities/favorite.entity";

export function favoriteFromProductCard(card: ProductCardViewModel): FavoriteItemInput {
  return {
    type: "product",
    targetId: card.id,
    ownerUid: card.ownerUid,
    title: card.title,
    subtitle: card.subtitle,
    imageUrl: card.imageUrl,
    priceText: card.priceText,
    ratingText: card.ratingText,
    href: card.href,
  };
}

export function favoriteFromSellerCard(card: SellerCardViewModel): FavoriteItemInput {
  return {
    type: "seller",
    targetId: card.uid,
    ownerUid: card.uid,
    title: card.title,
    subtitle: card.subtitle,
    imageUrl: card.avatarUrl,
    priceText: "",
    ratingText: card.ratingText,
    href: card.href,
  };
}

export function productCardFromFavorite(item: FavoriteItem): ProductCardViewModel {
  return {
    id: item.targetId,
    ownerUid: item.ownerUid,
    title: item.title,
    subtitle: item.subtitle,
    description: "",
    imageUrl: item.imageUrl,
    priceText: item.priceText,
    oldPriceText: "",
    ratingText: item.ratingText,
    ratingValue: null,
    available: true,
    needsCar: false,
    categoryLabel: "",
    href: item.href,
    badges: [],
  };
}

export function sellerCardFromFavorite(item: FavoriteItem): SellerCardViewModel {
  const parts = item.title.trim().split(/\s+/).filter(Boolean);
  const initials = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "?";
  return {
    uid: item.targetId,
    title: item.title,
    subtitle: item.subtitle,
    description: "",
    avatarUrl: item.imageUrl,
    coverUrl: "",
    initials,
    href: item.href,
    ratingText: item.ratingText,
    ratingValue: null,
    badges: [],
  };
}
