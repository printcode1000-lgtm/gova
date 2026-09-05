import type {
  MarketplaceOrderDetailsDto,
} from "./transport-contract";

export type MarketplaceOrderDetailsRows = MarketplaceOrderDetailsDto;

export function filterOrderDetailsForActor<
  T extends MarketplaceOrderDetailsRows,
>(details: T, actor: { id: string; role: string }): T {
  if (actor.role !== "seller" && actor.role !== "service_provider") {
    return details;
  }

  const ownCandidateStops = new Set(
    details.deliveryPlanCandidateStops
      .filter((entry) => String(entry.providerId) === actor.id)
      .map((entry) => String(entry.stopId)),
  );
  const allowedSellerOrderIds = new Set(
    details.sellerOrders
      .filter(
        (sellerOrder) =>
          String(sellerOrder.sellerId) === actor.id ||
          String(sellerOrder.serviceProviderId) === actor.id,
      )
      .map((sellerOrder) => String(sellerOrder.id)),
  );
  for (const stop of details.deliveryPlanStops) {
    if (ownCandidateStops.has(String(stop.id))) {
      allowedSellerOrderIds.add(String(stop.sellerOrderId));
    }
  }
  const ownQuoteIds = new Set(
    details.deliveryPlanQuotes
      .filter((quote) => String(quote.providerId) === actor.id)
      .map((quote) => String(quote.id)),
  );

  return {
    ...details,
    sellerOrders: details.sellerOrders.filter((sellerOrder) =>
      allowedSellerOrderIds.has(String(sellerOrder.id)),
    ),
    orderItems: details.orderItems.filter((item) =>
      allowedSellerOrderIds.has(String(item.sellerOrderId)),
    ),
    customItems: details.customItems.filter((item) =>
      allowedSellerOrderIds.has(String(item.sellerOrderId)),
    ),
    shippingQuotes: details.shippingQuotes.filter((quote) =>
      allowedSellerOrderIds.has(String(quote.sellerOrderId)),
    ),
    deliveryPlans: details.deliveryPlans.map((plan) => ({
      ...plan,
      fallbackConfirmedPrice: 0,
      fallbackHasPendingQuotes: 1,
    })),
    deliveryPlanStops: details.deliveryPlanStops.filter((stop) =>
      allowedSellerOrderIds.has(String(stop.sellerOrderId)),
    ),
    deliveryPlanCandidates: details.deliveryPlanCandidates.filter(
      (candidate) => String(candidate.providerId) === actor.id,
    ),
    deliveryPlanCandidateStops: details.deliveryPlanCandidateStops.filter(
      (entry) => String(entry.providerId) === actor.id,
    ),
    deliveryPlanQuotes: details.deliveryPlanQuotes.filter((quote) =>
      ownQuoteIds.has(String(quote.id)),
    ),
    deliveryPlanQuoteStops: details.deliveryPlanQuoteStops.filter((entry) =>
      ownQuoteIds.has(String(entry.quoteId)),
    ),
  };
}
