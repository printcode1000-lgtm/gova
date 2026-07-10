export type ReturnShippingPayer = "buyer" | "seller" | "case_by_case";

export interface ProfileReturnPolicy {
  enabled: boolean;
  returnWindowDays: number;
  policyText: string;
  returnShippingPayer: ReturnShippingPayer;
}

export interface ProfileFulfillmentSettings {
  selfDeliveryEnabled: boolean;
  carrierUids: string[];
  returns: ProfileReturnPolicy;
}

export const EMPTY_PROFILE_FULFILLMENT_SETTINGS: ProfileFulfillmentSettings = {
  selfDeliveryEnabled: false,
  carrierUids: [],
  returns: {
    enabled: false,
    returnWindowDays: 14,
    policyText: "",
    returnShippingPayer: "case_by_case",
  },
};

export interface SaveProfileFulfillmentSettingsInput
  extends ProfileFulfillmentSettings {
  uid: string;
}
