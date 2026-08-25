import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const SHIPPING_PLATFORMS_PATH = "config/shipping-platforms.json";

export type ShippingProductionTruth = "google-play" | "app-store-connect";

export interface ShippingPlatformDeclaration {
  storeDistribution: boolean;
  productionTruth: ShippingProductionTruth;
  notLiveReason?: string;
}

export interface ShippingPlatformsDeclaration {
  schemaVersion: 1;
  android: ShippingPlatformDeclaration;
  ios: ShippingPlatformDeclaration;
}

export const APP_STORE_PRODUCTION_VERSION_STATES = [
  "READY_FOR_DISTRIBUTION",
] as const;

function isBoolean(value: unknown): value is boolean {
  return value === true || value === false;
}

function parsePlatform(
  value: unknown,
  name: "android" | "ios",
  expectedTruth: ShippingProductionTruth,
): ShippingPlatformDeclaration {
  if (!value || typeof value !== "object") {
    throw new Error(`Shipping platform declaration for ${name} is missing.`);
  }
  const record = value as Record<string, unknown>;
  if (!isBoolean(record.storeDistribution)) {
    throw new Error(
      `Shipping platform ${name}.storeDistribution must be an explicit boolean.`,
    );
  }
  if (record.productionTruth !== expectedTruth) {
    throw new Error(
      `Shipping platform ${name}.productionTruth must be ${expectedTruth}.`,
    );
  }
  const notLiveReason =
    typeof record.notLiveReason === "string" ? record.notLiveReason : undefined;
  if (record.storeDistribution === false && !notLiveReason?.trim()) {
    throw new Error(
      `Shipping platform ${name} is not live and must declare notLiveReason. Never infer disabled from missing credentials.`,
    );
  }
  return {
    storeDistribution: record.storeDistribution,
    productionTruth: expectedTruth,
    notLiveReason,
  };
}

export function parseShippingPlatformsDeclaration(
  value: unknown,
): ShippingPlatformsDeclaration {
  if (!value || typeof value !== "object") {
    throw new Error("Shipping platforms declaration is missing.");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1) {
    throw new Error("Shipping platforms declaration schemaVersion must be 1.");
  }
  return {
    schemaVersion: 1,
    android: parsePlatform(record.android, "android", "google-play"),
    ios: parsePlatform(record.ios, "ios", "app-store-connect"),
  };
}

export function readShippingPlatformsDeclaration(
  root = process.cwd(),
): ShippingPlatformsDeclaration {
  const filePath = path.join(root, SHIPPING_PLATFORMS_PATH);
  if (!existsSync(filePath)) {
    throw new Error(
      `Missing ${SHIPPING_PLATFORMS_PATH}. Live OTA cannot infer shipping platforms from credentials.`,
    );
  }
  return parseShippingPlatformsDeclaration(
    JSON.parse(readFileSync(filePath, "utf8")) as unknown,
  );
}

export function enabledStoreDistributionPlatforms(
  declaration: ShippingPlatformsDeclaration = readShippingPlatformsDeclaration(),
): Array<"android" | "ios"> {
  const enabled: Array<"android" | "ios"> = [];
  if (declaration.android.storeDistribution) enabled.push("android");
  if (declaration.ios.storeDistribution) enabled.push("ios");
  return enabled;
}
