import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type {
  DiscountBuyerContext,
  DiscountCartItem,
  SaveSellerDiscountInput,
  SellerDiscountCartQuote,
  SellerDiscountRule,
} from "../../domain/seller-discount.entity";

export class SellerDiscountApiService {
  async listSellerDiscounts(sellerUid: string, includeInactive = true, sessionToken?: string) {
    const q = new URLSearchParams({
      sellerUid,
      includeInactive: includeInactive ? "1" : "0",
    });
    return asolApi.get<SellerDiscountRule[]>(
      `${ASOL_API_ROUTES.profile.discounts}?${q}`,
      {
        cache: "no-store",
        ...(sessionToken ? { headers: { "x-asol-session-token": sessionToken } } : {}),
      },
    );
  }

  async saveSellerDiscounts(
    sellerUid: string,
    discounts: SaveSellerDiscountInput[],
    sessionToken: string,
  ) {
    if (!sessionToken.trim()) throw new Error("sessionTokenInvalid");
    return asolApi.put<SellerDiscountRule[]>(
      ASOL_API_ROUTES.profile.discounts,
      { sellerUid, discounts },
      { headers: { "x-asol-session-token": sessionToken } },
    );
  }

  async quoteCart(items: DiscountCartItem[], context?: DiscountBuyerContext, sessionToken?: string) {
    return asolApi.post<SellerDiscountCartQuote>(
      ASOL_API_ROUTES.profile.discountQuote,
      { items, context },
      sessionToken
        ? { headers: { "x-asol-session-token": sessionToken } }
        : undefined,
    );
  }
}

export const sellerDiscountApiService = new SellerDiscountApiService();
