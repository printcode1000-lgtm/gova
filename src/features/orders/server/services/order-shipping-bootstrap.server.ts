import "server-only";

import { calculateSellerShipping } from "@/features/cart";
import { profileService } from "@/features/profile/server";
import type { MarketplaceOrderService } from "@asol/data-core/marketplace-orders";
import type { Actor } from "@asol/orders-core";
import type { MarketplaceOrderDetailsDto } from "@asol/orders-core";

type OrderDetailsLike = Pick<
  MarketplaceOrderDetailsDto,
  "sellerOrders" | "orderItems" | "shippingQuotes" | "deliveryPlans"
>;

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
    const sellerId = String(sellerOrder.sellerId ?? "");
    if (!sellerOrderId || !sellerId) continue;

    const items = details.orderItems.filter(
      (item) => String(item.sellerOrderId) === sellerOrderId,
    );
    const subtotalMinor = items.reduce(
      (total, item) =>
        total + Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0),
      0,
    );
    const settings = await profileService.getFulfillmentSettings(sellerId);
    const shipping = calculateSellerShipping(
      settings.shippingPricing,
      subtotalMinor,
      items.some((item) => Number(item.requiresSpecialVehicle) > 0),
    );
    if (!shipping.quoteRequired) continue;

    const hasQuote = details.shippingQuotes.some(
      (quote) => String(quote.sellerOrderId) === sellerOrderId,
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
