import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type {
  DiscountBuyerContext,
  DiscountCartItem,
  SaveSellerDiscountInput,
  SellerDiscountCartQuote,
  SellerDiscountRule,
} from "../entities/seller-discount.entity";

export class SellerDiscountApiService {
  async listSellerDiscounts(sellerUid: string, includeInactive = true) {
    const q = new URLSearchParams({
      sellerUid,
      includeInactive: includeInactive ? "1" : "0",
    });
    return asolApi.get<SellerDiscountRule[]>(
      `${ASOL_API_ROUTES.profile.discounts}?${q}`,
      { cache: "no-store" },
    );
  }

  async saveSellerDiscounts(sellerUid: string, discounts: SaveSellerDiscountInput[]) {
    return asolApi.put<SellerDiscountRule[]>(ASOL_API_ROUTES.profile.discounts, {
      sellerUid,
      discounts,
    });
  }

  async quoteCart(items: DiscountCartItem[], context?: DiscountBuyerContext) {
    return asolApi.post<SellerDiscountCartQuote>(
      ASOL_API_ROUTES.profile.discountQuote,
      { items, context },
    );
  }
}

export const sellerDiscountApiService = new SellerDiscountApiService();
