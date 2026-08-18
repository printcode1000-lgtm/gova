export type SellerShippingPricingMode = "free" | "flat" | "by_location";

export type ReturnShippingPayer = "buyer" | "seller" | "case_by_case";

export interface SellerFulfillmentSnapshot {
  shippingPricing: {
    mode: SellerShippingPricingMode;
    flatRate: number;
    specialVehicleFee: number;
    freeShippingThreshold: number;
    notes: string;
  };
  returns: {
    enabled: boolean;
    returnWindowDays: number;
    policyText: string;
    returnShippingPayer: ReturnShippingPayer;
  };
}

export const EMPTY_SELLER_FULFILLMENT_SNAPSHOT: SellerFulfillmentSnapshot = {
  shippingPricing: {
    mode: "free",
    flatRate: 0,
    specialVehicleFee: 0,
    freeShippingThreshold: 0,
    notes: "",
  },
  returns: {
    enabled: false,
    returnWindowDays: 14,
    policyText: "",
    returnShippingPayer: "case_by_case",
  },
};

export function parseSellerFulfillmentSnapshot(
  raw: unknown,
): SellerFulfillmentSnapshot {
  try {
    const value =
      typeof raw === "string"
        ? (JSON.parse(raw) as Partial<SellerFulfillmentSnapshot>)
        : ((raw as Partial<SellerFulfillmentSnapshot>) ?? {});
    const shipping = value.shippingPricing ?? EMPTY_SELLER_FULFILLMENT_SNAPSHOT.shippingPricing;
    const returns = value.returns ?? EMPTY_SELLER_FULFILLMENT_SNAPSHOT.returns;
    const mode = shipping.mode;
    return {
      shippingPricing: {
        mode:
          mode === "free" || mode === "flat" || mode === "by_location"
            ? mode
            : "free",
        flatRate: Number(shipping.flatRate) || 0,
        specialVehicleFee: Number(shipping.specialVehicleFee) || 0,
        freeShippingThreshold: Number(shipping.freeShippingThreshold) || 0,
        notes: typeof shipping.notes === "string" ? shipping.notes : "",
      },
      returns: {
        enabled: returns.enabled === true,
        returnWindowDays: Number(returns.returnWindowDays) || 14,
        policyText:
          typeof returns.policyText === "string" ? returns.policyText : "",
        returnShippingPayer:
          returns.returnShippingPayer === "buyer" ||
          returns.returnShippingPayer === "seller" ||
          returns.returnShippingPayer === "case_by_case"
            ? returns.returnShippingPayer
            : "case_by_case",
      },
    };
  } catch {
    return EMPTY_SELLER_FULFILLMENT_SNAPSHOT;
  }
}

export function serializeSellerFulfillmentSnapshot(
  snapshot: SellerFulfillmentSnapshot,
): string {
  return JSON.stringify(snapshot);
}

export function fulfillmentSettingsToSnapshot(input: {
  shippingPricing: SellerFulfillmentSnapshot["shippingPricing"];
  returns: SellerFulfillmentSnapshot["returns"];
}): SellerFulfillmentSnapshot {
  return parseSellerFulfillmentSnapshot({
    shippingPricing: input.shippingPricing,
    returns: input.returns,
  });
}
