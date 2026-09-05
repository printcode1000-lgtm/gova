"use client";

import type { ProductCardViewModel } from "@asol/product-card-core";
import { favoriteFromProductCard } from "@asol/favorites-core";
import { FavoriteButton } from "@asol/favorites-core/ui";

/** Host-owned favorite control passed into `ProductCard`'s favorite slot. */
export function ProductCardFavoriteSlot({ card }: { card: ProductCardViewModel }) {
  return (
    <FavoriteButton
      item={favoriteFromProductCard(card)}
      className="absolute end-2 top-2 z-10"
    />
  );
}
