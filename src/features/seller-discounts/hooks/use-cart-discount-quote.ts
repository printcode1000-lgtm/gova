"use client";

import * as React from "react";
import type { CartItem } from "@/features/cart/cart-store";
import { sellerDiscountApiService } from "../services/seller-discount-api-service";
import type {
  DiscountBuyerContext,
  SellerDiscountCartQuote,
} from "../entities/seller-discount.entity";

export function useCartDiscountQuote(
  items: CartItem[],
  context: DiscountBuyerContext,
) {
  const [quote, setQuote] = React.useState<SellerDiscountCartQuote | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    if (items.length === 0) {
      setQuote(null);
      return;
    }
    setIsLoading(true);
    void sellerDiscountApiService
      .quoteCart(
        items.map((item) => ({
          id: item.id,
          productId: item.productId,
          sellerId: item.sellerId,
          name: item.name,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          mainCategoryId: item.mainCategoryId,
        })),
        context,
      )
      .then((next) => {
        if (!cancelled) setQuote(next);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    items,
    context.buyerUid,
    context.couponCodes?.join("|"),
    context.isApp,
    context.isFirstOrder,
    context.isFollower,
  ]);

  return { quote, isLoading };
}
