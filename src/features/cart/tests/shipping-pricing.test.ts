import assert from "node:assert/strict";

import { calculateSellerShipping } from "../shipping-pricing";

const common = {
  flatRate: 30,
  specialVehicleFee: 75,
  freeShippingThreshold: 1_000,
  notes: "",
};

assert.deepEqual(
  calculateSellerShipping({ ...common, mode: "free" }, 50_000, false),
  {
    baseShippingMinor: 0,
    specialVehicleFeeMinor: 0,
    confirmedShippingMinor: 0,
    quoteRequired: false,
    freeThresholdApplied: false,
  },
);

assert.deepEqual(
  calculateSellerShipping({ ...common, mode: "free" }, 50_000, true),
  {
    baseShippingMinor: 0,
    specialVehicleFeeMinor: 7_500,
    confirmedShippingMinor: 7_500,
    quoteRequired: false,
    freeThresholdApplied: false,
  },
);

assert.deepEqual(
  calculateSellerShipping({ ...common, mode: "flat" }, 99_999, false),
  {
    baseShippingMinor: 3_000,
    specialVehicleFeeMinor: 0,
    confirmedShippingMinor: 3_000,
    quoteRequired: false,
    freeThresholdApplied: false,
  },
);

assert.deepEqual(
  calculateSellerShipping({ ...common, mode: "flat" }, 100_000, true),
  {
    baseShippingMinor: 0,
    specialVehicleFeeMinor: 7_500,
    confirmedShippingMinor: 7_500,
    quoteRequired: false,
    freeThresholdApplied: true,
  },
);

assert.deepEqual(
  calculateSellerShipping({ ...common, mode: "by_location" }, 99_999, true),
  {
    baseShippingMinor: 0,
    specialVehicleFeeMinor: 7_500,
    confirmedShippingMinor: 7_500,
    quoteRequired: true,
    freeThresholdApplied: false,
  },
);

assert.deepEqual(
  calculateSellerShipping({ ...common, mode: "by_location" }, 100_000, true),
  {
    baseShippingMinor: 0,
    specialVehicleFeeMinor: 7_500,
    confirmedShippingMinor: 7_500,
    quoteRequired: false,
    freeThresholdApplied: true,
  },
);

console.log(
  "cart shipping pricing: free, flat, location quote, threshold, and vehicle fee verified",
);
