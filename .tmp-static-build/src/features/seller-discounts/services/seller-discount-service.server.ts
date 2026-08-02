import "server-only";

import type {
  DiscountBuyerContext,
  DiscountCartItem,
  SaveSellerDiscountInput,
} from "../entities/seller-discount.entity";
import { calculateCartDiscounts } from "./seller-discount-engine";
import { sellerDiscountRepository } from "@/modules/data-access/domains/seller-discounts/index.server";

export class SellerDiscountService {
  async listSellerDiscounts(sellerUid: string, includeInactive = true) {
    if (!sellerUid) return [];
    return sellerDiscountRepository.listBySeller(sellerUid, includeInactive);
  }

  async saveSellerDiscounts(sellerUid: string, discounts: SaveSellerDiscountInput[]) {
    if (!sellerUid) throw new Error("sellerUidRequired");
    return sellerDiscountRepository.replaceSellerDiscounts(sellerUid, discounts);
  }

  async quoteCart(input: {
    items: DiscountCartItem[];
    context?: DiscountBuyerContext;
  }) {
    const sellerUids = Array.from(new Set(input.items.map((item) => item.sellerId)));
    const discounts = await sellerDiscountRepository.listActiveForSellers(sellerUids);
    const usage = await sellerDiscountRepository.getUsageSummary(
      discounts.map((discount) => discount.id),
      input.context?.buyerUid,
    );
    return calculateCartDiscounts({
      items: input.items,
      discounts,
      context: input.context,
      usage,
    });
  }

  async recordAppliedUsages(input: {
    buyerUid?: string;
    orderId?: string;
    applied: Array<{
      discountId: string;
      sellerUid: string;
      discountMinor: number;
      shippingDiscountMinor: number;
    }>;
  }) {
    for (const item of input.applied) {
      await sellerDiscountRepository.recordUsage({
        discountId: item.discountId,
        sellerUid: item.sellerUid,
        buyerUid: input.buyerUid,
        orderId: input.orderId,
        discountMinor:
          item.discountMinor +
          (item.shippingDiscountMinor === Number.MAX_SAFE_INTEGER
            ? 0
            : item.shippingDiscountMinor),
      });
    }
  }
}

export const sellerDiscountService = new SellerDiscountService();
