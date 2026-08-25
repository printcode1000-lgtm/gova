import type { ShippingPlatformsDeclaration } from "@asol/ota-core/publishing";

import type { ReleaseSecretScope } from "./ensure-release-secrets-restored";

export function fastlaneSecretScopes(
  args: readonly string[],
  shipping: ShippingPlatformsDeclaration,
): ReleaseSecretScope[] {
  const [platform, lane] = args;
  if (platform === "android") {
    const scopes: ReleaseSecretScope[] = ["google-play"];
    if (!lane?.includes("unsigned")) scopes.push("android-signing");
    return scopes;
  }

  if (platform !== "ios") return [];

  if (lane === "beta" && !shipping.ios.storeDistribution) {
    throw new Error(
      "TestFlight publishing is disabled by config/shipping-platforms.json (ios.storeDistribution=false).",
    );
  }

  return lane === "beta"
    ? ["ios-signing", "app-store"]
    : ["ios-signing"];
}
