type Row = Record<string, unknown>;

export interface MarketplaceOrderDetailsRows {
  sellerOrders: Row[];
  orderItems: Row[];
  customItems: Row[];
  shippingQuotes: Row[];
  deliveryPlans: Row[];
  deliveryPlanStops: Row[];
  deliveryPlanCandidates: Row[];
  deliveryPlanCandidateStops: Row[];
  deliveryPlanQuotes: Row[];
  deliveryPlanQuoteStops: Row[];
  [key: string]: unknown;
}

export function filterOrderDetailsForActor<
  T extends MarketplaceOrderDetailsRows,
>(details: T, actor: { id: string; role: string }): T {
  if (actor.role !== "seller" && actor.role !== "service_provider") {
    return details;
  }

  const ownCandidateStops = new Set(
    details.deliveryPlanCandidateStops
      .filter((entry) => String(entry.provider_id) === actor.id)
      .map((entry) => String(entry.stop_id)),
  );
  const allowedSellerOrderIds = new Set(
    details.sellerOrders
      .filter(
        (sellerOrder) =>
          String(sellerOrder.seller_id) === actor.id ||
          String(sellerOrder.service_provider_id) === actor.id,
      )
      .map((sellerOrder) => String(sellerOrder.id)),
  );
  for (const stop of details.deliveryPlanStops) {
    if (ownCandidateStops.has(String(stop.id))) {
      allowedSellerOrderIds.add(String(stop.seller_order_id));
    }
  }
  const ownQuoteIds = new Set(
    details.deliveryPlanQuotes
      .filter((quote) => String(quote.provider_id) === actor.id)
      .map((quote) => String(quote.id)),
  );

  return {
    ...details,
    sellerOrders: details.sellerOrders.filter((sellerOrder) =>
      allowedSellerOrderIds.has(String(sellerOrder.id)),
    ),
    orderItems: details.orderItems.filter((item) =>
      allowedSellerOrderIds.has(String(item.seller_order_id)),
    ),
    customItems: details.customItems.filter((item) =>
      allowedSellerOrderIds.has(String(item.seller_order_id)),
    ),
    shippingQuotes: details.shippingQuotes.filter((quote) =>
      allowedSellerOrderIds.has(String(quote.seller_order_id)),
    ),
    deliveryPlans: details.deliveryPlans.map((plan) => ({
      ...plan,
      fallback_confirmed_price: 0,
      fallback_has_pending_quotes: 1,
    })),
    deliveryPlanStops: details.deliveryPlanStops.filter((stop) =>
      allowedSellerOrderIds.has(String(stop.seller_order_id)),
    ),
    deliveryPlanCandidates: details.deliveryPlanCandidates.filter(
      (candidate) => String(candidate.provider_id) === actor.id,
    ),
    deliveryPlanCandidateStops: details.deliveryPlanCandidateStops.filter(
      (entry) => String(entry.provider_id) === actor.id,
    ),
    deliveryPlanQuotes: details.deliveryPlanQuotes.filter((quote) =>
      ownQuoteIds.has(String(quote.id)),
    ),
    deliveryPlanQuoteStops: details.deliveryPlanQuoteStops.filter((entry) =>
      ownQuoteIds.has(String(entry.quote_id)),
    ),
  };
}
