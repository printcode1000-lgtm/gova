export type ReturnShippingPayer = "buyer" | "seller" | "case_by_case";
export type ShippingPricingMode = "free" | "flat" | "by_location";

export interface ProfileReturnPolicy {
  enabled: boolean;
  returnWindowDays: number;
  policyText: string;
  returnShippingPayer: ReturnShippingPayer;
}

export interface ProfileFulfillmentSettings {
  selfDeliveryEnabled: boolean;
  carrierUids: string[];
  shippingPricing: {
    mode: ShippingPricingMode;
    flatRate: number;
    locationBaseRate: number;
    specialVehicleFee: number;
    freeShippingThreshold: number;
    notes: string;
  };
  returns: ProfileReturnPolicy;
}

export const EMPTY_PROFILE_FULFILLMENT_SETTINGS: ProfileFulfillmentSettings = {
  selfDeliveryEnabled: false,
  carrierUids: [],
  shippingPricing: {
    mode: "free",
    flatRate: 0,
    locationBaseRate: 0,
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

export function normalizeProfileFulfillmentSettings(
  value: Partial<ProfileFulfillmentSettings> | null | undefined,
): ProfileFulfillmentSettings {
  const defaults = EMPTY_PROFILE_FULFILLMENT_SETTINGS;
  const shippingPricing = value?.shippingPricing ?? defaults.shippingPricing;
  const returns = value?.returns ?? defaults.returns;

  return {
    selfDeliveryEnabled: value?.selfDeliveryEnabled === true,
    carrierUids: Array.isArray(value?.carrierUids) ? value.carrierUids : [],
    shippingPricing: {
      mode:
        shippingPricing.mode === "free" ||
        shippingPricing.mode === "flat" ||
        shippingPricing.mode === "by_location"
          ? shippingPricing.mode
          : defaults.shippingPricing.mode,
      flatRate: Number.isFinite(Number(shippingPricing.flatRate))
        ? Number(shippingPricing.flatRate)
        : defaults.shippingPricing.flatRate,
      locationBaseRate: Number.isFinite(Number(shippingPricing.locationBaseRate))
        ? Number(shippingPricing.locationBaseRate)
        : defaults.shippingPricing.locationBaseRate,
      specialVehicleFee: Number.isFinite(Number(shippingPricing.specialVehicleFee))
        ? Number(shippingPricing.specialVehicleFee)
        : defaults.shippingPricing.specialVehicleFee,
      freeShippingThreshold: Number.isFinite(
        Number(shippingPricing.freeShippingThreshold),
      )
        ? Number(shippingPricing.freeShippingThreshold)
        : defaults.shippingPricing.freeShippingThreshold,
      notes:
        typeof shippingPricing.notes === "string"
          ? shippingPricing.notes
          : defaults.shippingPricing.notes,
    },
    returns: {
      enabled: returns.enabled === true,
      returnWindowDays: Number.isFinite(Number(returns.returnWindowDays))
        ? Number(returns.returnWindowDays)
        : defaults.returns.returnWindowDays,
      policyText:
        typeof returns.policyText === "string"
          ? returns.policyText
          : defaults.returns.policyText,
      returnShippingPayer:
        returns.returnShippingPayer === "buyer" ||
        returns.returnShippingPayer === "seller" ||
        returns.returnShippingPayer === "case_by_case"
          ? returns.returnShippingPayer
          : defaults.returns.returnShippingPayer,
    },
  };
}

export interface SaveProfileFulfillmentSettingsInput
  extends ProfileFulfillmentSettings {
  uid: string;
}
