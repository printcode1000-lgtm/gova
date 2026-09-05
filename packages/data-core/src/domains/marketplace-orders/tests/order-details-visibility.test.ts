import assert from "node:assert/strict";

import { filterOrderDetailsForActor } from "@asol/orders-core";

const details = {
  order: { id: "order-1" },
  sellerOrders: [
    { id: "so-a", sellerId: "seller-a", serviceProviderId: "provider-a" },
    { id: "so-b", sellerId: "seller-b", serviceProviderId: "provider-b" },
  ],
  orderItems: [
    { id: "item-a", sellerOrderId: "so-a" },
    { id: "item-b", sellerOrderId: "so-b" },
  ],
  customItems: [],
  shippingQuotes: [
    { id: "sq-a", sellerOrderId: "so-a" },
    { id: "sq-b", sellerOrderId: "so-b" },
  ],
  deliveryPlans: [
    {
      id: "plan-1",
      fallbackConfirmedPrice: 9_000,
      fallbackHasPendingQuotes: 0,
    },
  ],
  deliveryPlanStops: [
    { id: "stop-a", sellerOrderId: "so-a" },
    { id: "stop-b", sellerOrderId: "so-b" },
  ],
  deliveryPlanCandidates: [
    { planId: "plan-1", providerId: "provider-a" },
    { planId: "plan-1", providerId: "provider-b" },
  ],
  deliveryPlanCandidateStops: [
    {
      planId: "plan-1",
      providerId: "provider-a",
      stopId: "stop-a",
    },
    {
      planId: "plan-1",
      providerId: "provider-b",
      stopId: "stop-b",
    },
  ],
  deliveryPlanQuotes: [
    { id: "quote-a", providerId: "provider-a" },
    { id: "quote-b", providerId: "provider-b" },
  ],
  deliveryPlanQuoteStops: [
    { quoteId: "quote-a", stopId: "stop-a" },
    { quoteId: "quote-b", stopId: "stop-b" },
  ],
};

const buyerView = filterOrderDetailsForActor(details, {
  id: "buyer",
  role: "buyer",
});
assert.equal(buyerView, details);

const providerView = filterOrderDetailsForActor(details, {
  id: "provider-a",
  role: "service_provider",
});
assert.deepEqual(
  providerView.sellerOrders.map((row) => row.id),
  ["so-a"],
);
assert.deepEqual(
  providerView.orderItems.map((row) => row.id),
  ["item-a"],
);
assert.deepEqual(
  providerView.deliveryPlanStops.map((row) => row.id),
  ["stop-a"],
);
assert.deepEqual(
  providerView.deliveryPlanQuotes.map((row) => row.id),
  ["quote-a"],
);
assert.deepEqual(
  providerView.deliveryPlanCandidates.map((row) => row.providerId),
  ["provider-a"],
);
assert.equal(providerView.deliveryPlans[0].fallbackConfirmedPrice, 0);
assert.equal(providerView.deliveryPlans[0].fallbackHasPendingQuotes, 1);

console.log(
  "order details visibility: buyer completeness and provider stop/quote isolation verified",
);
