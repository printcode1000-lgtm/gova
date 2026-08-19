import type { SellerFulfillmentSnapshot } from "../domain/fulfillment-snapshot";

export interface SellerShippingCalculation {
  baseShippingMinor: number;
  specialVehicleFeeMinor: number;
  confirmedShippingMinor: number;
  quoteRequired: boolean;
  freeThresholdApplied: boolean;
}

function toMinorUnits(value: number) {
  const minor = Math.round(Number(value) * 100);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : 0;
}

export function calculateSellerShippingFromSnapshot(
  pricing: SellerFulfillmentSnapshot["shippingPricing"],
  subtotalMinor: number,
  requiresSpecialVehicle: boolean,
): SellerShippingCalculation {
  const thresholdMinor = toMinorUnits(pricing.freeShippingThreshold);
  const freeThresholdApplied =
    thresholdMinor > 0 && subtotalMinor >= thresholdMinor;
  const baseShippingIsFree = pricing.mode === "free" || freeThresholdApplied;
  const quoteRequired = pricing.mode === "by_location" && !baseShippingIsFree;
  const baseShippingMinor =
    pricing.mode === "flat" && !baseShippingIsFree
      ? toMinorUnits(pricing.flatRate)
      : 0;
  const specialVehicleFeeMinor = requiresSpecialVehicle
    ? toMinorUnits(pricing.specialVehicleFee)
    : 0;

  return {
    baseShippingMinor,
    specialVehicleFeeMinor,
    confirmedShippingMinor: baseShippingMinor + specialVehicleFeeMinor,
    quoteRequired,
    freeThresholdApplied,
  };
}
