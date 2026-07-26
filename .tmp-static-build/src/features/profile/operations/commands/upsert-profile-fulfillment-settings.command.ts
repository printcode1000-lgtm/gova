import "server-only";

import type {
  ProfileFulfillmentSettings,
  SaveProfileFulfillmentSettingsInput,
} from "../../entities/profile-fulfillment-settings.entity";
import type { IProfileRepository } from "../../repositories/profile-repository.interface";

function normalizeCarrierUids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((uid): uid is string => typeof uid === "string")
        .map((uid) => uid.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

function normalizeSettings(
  input: SaveProfileFulfillmentSettingsInput,
): ProfileFulfillmentSettings {
  const days = Number(input.returns?.returnWindowDays);
  const payer = input.returns?.returnShippingPayer;
  const shippingMode = input.shippingPricing?.mode;
  const positiveMoney = (value: unknown) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100) / 100) : 0;
  };

  return {
    selfDeliveryEnabled: false,
    carrierUids: normalizeCarrierUids(input.carrierUids),
    shippingPricing: {
      mode:
        shippingMode === "free" ||
        shippingMode === "flat" ||
        shippingMode === "by_location"
          ? shippingMode
          : "free",
      flatRate: positiveMoney(input.shippingPricing?.flatRate),
      specialVehicleFee: positiveMoney(input.shippingPricing?.specialVehicleFee),
      freeShippingThreshold: positiveMoney(
        input.shippingPricing?.freeShippingThreshold,
      ),
      notes:
        typeof input.shippingPricing?.notes === "string"
          ? input.shippingPricing.notes.trim().slice(0, 1000)
          : "",
    },
    returns: {
      enabled: input.returns?.enabled === true,
      returnWindowDays: Number.isInteger(days)
        ? Math.min(365, Math.max(0, days))
        : 14,
      policyText:
        typeof input.returns?.policyText === "string"
          ? input.returns.policyText.trim().slice(0, 2000)
          : "",
      returnShippingPayer:
        payer === "buyer" || payer === "seller" || payer === "case_by_case"
          ? payer
          : "case_by_case",
    },
  };
}

export class UpsertProfileFulfillmentSettingsCommand {
  constructor(private repository: IProfileRepository) {}

  async execute(
    input: SaveProfileFulfillmentSettingsInput,
  ): Promise<ProfileFulfillmentSettings> {
    const settings = normalizeSettings(input);
    const validCarrierUids = await this.repository.getDeliveryServiceUids(
      settings.carrierUids,
    );
    if (validCarrierUids.length !== settings.carrierUids.length) {
      throw new Error("invalidDeliveryCarrier");
    }
    await this.repository.upsertFulfillmentSettings(input.uid, settings);
    return settings;
  }
}
