import assert from "node:assert/strict";
import {
  collectAllOrderPartyUids,
  collectOrderPartyUids,
  excludeActorFromPartyUids,
  resolveOrderUpdateRecipients,
} from "../services/order-party-helpers";

const snapshot = {
  buyerId: "buyer_1",
  sellerOrders: [
    { seller_id: "seller_a", service_provider_id: "provider_x" },
    { seller_id: "seller_b", service_provider_id: "provider_y" },
  ],
  shipments: [{ carrier_id: "carrier_1" }, { carrier_id: "provider_x" }],
  deliveryPlanCandidates: [{ provider_id: "provider_z" }],
};

assert.deepEqual(collectOrderPartyUids(snapshot.sellerOrders), {
  sellerUids: ["seller_a", "seller_b"],
  providerUids: ["provider_x", "provider_y"],
});

assert.deepEqual(collectAllOrderPartyUids(snapshot), [
  "buyer_1",
  "seller_a",
  "seller_b",
  "provider_x",
  "provider_y",
  "carrier_1",
  "provider_z",
]);

assert.deepEqual(excludeActorFromPartyUids(["a", "b", "a"], "a"), ["b"]);
assert.deepEqual(excludeActorFromPartyUids(["seller_a", "buyer_1"], "seller_a"), [
  "buyer_1",
]);

assert.deepEqual(resolveOrderUpdateRecipients(snapshot, "buyer_1"), [
  "seller_a",
  "seller_b",
  "provider_x",
  "provider_y",
  "carrier_1",
  "provider_z",
]);

assert.deepEqual(resolveOrderUpdateRecipients(snapshot, "seller_a"), [
  "buyer_1",
  "seller_b",
  "provider_x",
  "provider_y",
  "carrier_1",
  "provider_z",
]);

console.log("Order party helper tests passed.");
