import { compareOtaVersions } from "../../domain/versioning/version-ordering";
import { assertNativeVersion } from "../../domain/versioning/content-version";
import { requireGooglePlayProductionNativeVersion } from "../adapters/google-play.adapter";
import {
  appStoreConnectCredentialsAreReady,
  requireIosProductionNativeVersion,
} from "../adapters/app-store-connect.adapter";
import { googlePlayCredentialsAreReady } from "../adapters/google-play.adapter";
import {
  enabledStoreDistributionPlatforms,
  readShippingPlatformsDeclaration,
  type ShippingPlatformsDeclaration,
} from "../config/shipping-platforms";

export interface StoreProductionReaders {
  android: () => Promise<string>;
  ios: () => Promise<string>;
}

export interface OtaNativeCompatibilityLine {
  minimumNativeVersion: string;
  androidProduction?: string;
  iosProduction?: string;
  enabledPlatforms: Array<"android" | "ios">;
}

export class PlatformTruthError extends Error {
  constructor(
    readonly platform: "android" | "ios",
    message: string,
  ) {
    super(message);
    this.name = "PlatformTruthError";
  }
}

function minimumOf(versions: string[]): string {
  return versions.reduce((lowest, current) =>
    compareOtaVersions(current, lowest) < 0 ? current : lowest,
  );
}

export async function resolveOtaNativeCompatibilityLine(options: {
  declaration?: ShippingPlatformsDeclaration;
  readers?: Partial<StoreProductionReaders>;
  credentialsReady?: Partial<Record<"android" | "ios", boolean>>;
  requiredCapabilities?: readonly string[];
  platformCapabilities?: Partial<Record<"android" | "ios", readonly string[]>>;
} = {}): Promise<OtaNativeCompatibilityLine> {
  const declaration = options.declaration ?? readShippingPlatformsDeclaration();
  const enabled = enabledStoreDistributionPlatforms(declaration);
  if (enabled.length === 0) {
    throw new Error(
      "No store-distribution platform is enabled. OTA cannot infer a native compatibility line.",
    );
  }

  const readers: StoreProductionReaders = {
    android:
      options.readers?.android ?? requireGooglePlayProductionNativeVersion,
    ios: options.readers?.ios ?? requireIosProductionNativeVersion,
  };

  const collected: Partial<Record<"android" | "ios", string>> = {};
  for (const platform of enabled) {
    if (
      platform === "android" &&
      !options.readers?.android &&
      !(options.credentialsReady?.android ?? googlePlayCredentialsAreReady())
    ) {
      throw new PlatformTruthError(
        "android",
        "Google Play credentials are required for live OTA because Android store-distribution is enabled.",
      );
    }
    if (
      platform === "ios" &&
      !options.readers?.ios &&
      !(options.credentialsReady?.ios ?? appStoreConnectCredentialsAreReady())
    ) {
      throw new PlatformTruthError(
        "ios",
        "App Store Connect credentials are required for live OTA because iOS store-distribution is enabled. Missing credentials do not disable the platform.",
      );
    }
    try {
      const version = await readers[platform]();
      assertNativeVersion(version);
      collected[platform] = version;
    } catch (error) {
      if (error instanceof PlatformTruthError) throw error;
      throw new PlatformTruthError(
        platform,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const versions = enabled.map((platform) => collected[platform]!);
  const minimumNativeVersion = minimumOf(versions);

  const required = options.requiredCapabilities ?? [];
  if (required.length > 0) {
    for (const platform of enabled) {
      const available = new Set(options.platformCapabilities?.[platform] ?? []);
      const missing = required.filter((capability) => !available.has(capability));
      if (missing.length > 0) {
        throw new PlatformTruthError(
          platform,
          `OTA requires native capabilities unavailable on ${platform}: ${missing.join(", ")}.`,
        );
      }
    }
  }

  return {
    minimumNativeVersion,
    androidProduction: collected.android,
    iosProduction: collected.ios,
    enabledPlatforms: enabled,
  };
}
