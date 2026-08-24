import "server-only";

import { calculateSellerShipping } from "@/features/cart";
import { profileService } from "@/features/profile/server";
import type { MarketplaceOrderService } from "@asol/data-core/marketplace-orders";
import type { Actor } from "@asol/orders-core";

interface OrderDetailsLike {
  sellerOrders: Array<Record<string, unknown>>;
  orderItems: Array<Record<string, unknown>>;
  shippingQuotes: Array<Record<string, unknown>>;
  deliveryPlans: Array<Record<string, unknown>>;
}

export async function bootstrapLocationShippingQuotes(
  orderId: string,
  details: OrderDetailsLike,
  service: MarketplaceOrderService,
  actor: Actor,
): Promise<string[]> {
  const unifiedPlan = details.deliveryPlans[0];
  const unifiedPlanActive =
    unifiedPlan &&
    !["separate_selected", "cancelled"].includes(String(unifiedPlan.status));
  if (unifiedPlanActive) return [];

  const createdSellerOrderIds: string[] = [];
  for (const sellerOrder of details.sellerOrders) {
    const sellerOrderId = String(sellerOrder.id ?? "");
    const sellerId = String(sellerOrder.seller_id ?? "");
    if (!sellerOrderId || !sellerId) continue;

    const items = details.orderItems.filter(
      (item) => String(item.seller_order_id) === sellerOrderId,
    );
    const subtotalMinor = items.reduce(
      (total, item) =>
        total + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
      0,
    );
    const settings = await profileService.getFulfillmentSettings(sellerId);
    const shipping = calculateSellerShipping(
      settings.shippingPricing,
      subtotalMinor,
      items.some((item) => Number(item.requires_special_vehicle) > 0),
    );
    if (!shipping.quoteRequired) continue;

    const hasQuote = details.shippingQuotes.some(
      (quote) => String(quote.seller_order_id) === sellerOrderId,
    );
    if (hasQuote) continue;

    await service.requestShippingQuote(
      orderId,
      sellerOrderId,
      shipping.specialVehicleFeeMinor,
      actor,
    );
    createdSellerOrderIds.push(sellerOrderId);
  }
  return createdSellerOrderIds;
}
