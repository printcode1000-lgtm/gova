import assert from "node:assert/strict";
import {
  collectAllOrderPartyUids,
  collectOrderPartyUids,
  excludeActorFromPartyUids,
  resolveOrderUpdateRecipients,
} from "../application/services/order-party-helpers";

const snapshot = {
  buyerId: "buyer_1",
  sellerOrders: [
    { sellerId: "seller_a", serviceProviderId: "provider_x" },
    { sellerId: "seller_b", serviceProviderId: "provider_y" },
  ],
  shipments: [{ carrierId: "carrier_1" }, { carrierId: "provider_x" }],
  deliveryPlanCandidates: [{ providerId: "provider_z" }],
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
