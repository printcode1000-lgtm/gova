"use client";

import type { SellerCardViewModel } from "@asol/seller-card-core";
import { favoriteFromSellerCard } from "@asol/favorites-core";
import { FavoriteButton } from "@asol/favorites-core/ui";

/** Host-owned follow/favorite control passed into `SellerCard`'s favorite slot. */
export function SellerCardFavoriteSlot({ card }: { card: SellerCardViewModel }) {
  return (
    <FavoriteButton
      item={favoriteFromSellerCard(card)}
      variant="follow"
      className="absolute end-2 top-2 z-10"
    />
  );
}
