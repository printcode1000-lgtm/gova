"use client";

import * as React from "react";
import type { CartItem } from "@/features/cart/ui";
import { useSessionRuntime } from "@/shared/session-runtime";
import { sellerDiscountApiService } from "../../application/services/seller-discount-api-service";
import type {
  DiscountBuyerContext,
  SellerDiscountCartQuote,
} from "../../domain/seller-discount.entity";

export function useCartDiscountQuote(
  items: CartItem[],
  context: DiscountBuyerContext,
) {
  const { session } = useSessionRuntime();
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
        session?.sessionToken,
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
    session?.sessionToken,
  ]);

  return { quote, isLoading };
}
