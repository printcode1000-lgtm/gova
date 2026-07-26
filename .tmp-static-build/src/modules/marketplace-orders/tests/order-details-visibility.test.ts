import assert from "node:assert/strict";

import { filterOrderDetailsForActor } from "../domain/order-details-visibility";

const details = {
  order: { id: "order-1" },
  sellerOrders: [
    { id: "so-a", seller_id: "seller-a", service_provider_id: "provider-a" },
    { id: "so-b", seller_id: "seller-b", service_provider_id: "provider-b" },
  ],
  orderItems: [
    { id: "item-a", seller_order_id: "so-a" },
    { id: "item-b", seller_order_id: "so-b" },
  ],
  customItems: [],
  shippingQuotes: [
    { id: "sq-a", seller_order_id: "so-a" },
    { id: "sq-b", seller_order_id: "so-b" },
  ],
  deliveryPlans: [
    {
      id: "plan-1",
      fallback_confirmed_price: 9_000,
      fallback_has_pending_quotes: 0,
    },
  ],
  deliveryPlanStops: [
    { id: "stop-a", seller_order_id: "so-a" },
    { id: "stop-b", seller_order_id: "so-b" },
  ],
  deliveryPlanCandidates: [
    { plan_id: "plan-1", provider_id: "provider-a" },
    { plan_id: "plan-1", provider_id: "provider-b" },
  ],
  deliveryPlanCandidateStops: [
    {
      plan_id: "plan-1",
      provider_id: "provider-a",
      stop_id: "stop-a",
    },
    {
      plan_id: "plan-1",
      provider_id: "provider-b",
      stop_id: "stop-b",
    },
  ],
  deliveryPlanQuotes: [
    { id: "quote-a", provider_id: "provider-a" },
    { id: "quote-b", provider_id: "provider-b" },
  ],
  deliveryPlanQuoteStops: [
    { quote_id: "quote-a", stop_id: "stop-a" },
    { quote_id: "quote-b", stop_id: "stop-b" },
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
  providerView.deliveryPlanCandidates.map((row) => row.provider_id),
  ["provider-a"],
);
assert.equal(providerView.deliveryPlans[0].fallback_confirmed_price, 0);
assert.equal(providerView.deliveryPlans[0].fallback_has_pending_quotes, 1);

console.log(
  "order details visibility: buyer completeness and provider stop/quote isolation verified",
);
