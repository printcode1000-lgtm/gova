import assert from "node:assert/strict";

import { createMultiSellerDeliveryDraft } from "../multi-seller-delivery-planner";

const draft = createMultiSellerDeliveryDraft(
  [
    {
      sellerId: "seller-a",
      carrierUids: ["provider-shared", "provider-a"],
      fallbackShippingMinor: 4_000,
      fallbackSpecialVehicleFeeMinor: 0,
      requiresLocationQuote: false,
      requiresSpecialVehicle: false,
    },
    {
      sellerId: "seller-b",
      carrierUids: ["provider-shared", "provider-b"],
      fallbackShippingMinor: 5_000,
      fallbackSpecialVehicleFeeMinor: 1_000,
      requiresLocationQuote: true,
      requiresSpecialVehicle: true,
    },
  ],
  ["provider-network", "provider-shared"],
);

assert.equal(draft.enabled, true);
assert.equal(draft.strategy, "unified");
assert.equal(draft.sellerCount, 2);
assert.equal(draft.fallbackConfirmedPriceMinor, 9_000);
assert.equal(draft.fallbackHasPendingQuotes, true);
assert.equal(draft.specialVehicleRequired, true);
assert.deepEqual(
  draft.candidates.map((candidate) => [
    candidate.providerId,
    candidate.source,
    candidate.coverageScore,
  ]),
  [
    ["provider-shared", "linked", 2],
    ["provider-a", "linked", 1],
    ["provider-b", "linked", 1],
    ["provider-network", "qualified_network", 0],
  ],
);
assert.deepEqual(draft.candidates[0].sellerIds, ["seller-a", "seller-b"]);
assert.deepEqual(
  draft.candidates.find(
    (candidate) => candidate.providerId === "provider-network",
  )?.sellerIds,
  ["seller-a", "seller-b"],
);

const singleSeller = createMultiSellerDeliveryDraft(
  [
    {
      sellerId: "seller-a",
      carrierUids: ["provider-a"],
      fallbackShippingMinor: 4_000,
      fallbackSpecialVehicleFeeMinor: 0,
      requiresLocationQuote: false,
      requiresSpecialVehicle: false,
    },
  ],
  ["provider-network"],
);
assert.equal(singleSeller.enabled, false);
assert.equal(singleSeller.strategy, "separate");

const unavailable = createMultiSellerDeliveryDraft(
  [
    {
      sellerId: "seller-a",
      carrierUids: [],
      fallbackShippingMinor: 0,
      fallbackSpecialVehicleFeeMinor: 0,
      requiresLocationQuote: false,
      requiresSpecialVehicle: false,
    },
    {
      sellerId: "seller-b",
      carrierUids: [],
      fallbackShippingMinor: 0,
      fallbackSpecialVehicleFeeMinor: 0,
      requiresLocationQuote: false,
      requiresSpecialVehicle: false,
    },
  ],
  [],
);
assert.equal(unavailable.enabled, false);

console.log(
  "multi-seller delivery planner: provider ranking, fallback, and eligibility verified",
);
