import assert from "node:assert/strict";

import type { ShippingPlatformsDeclaration } from "@asol/ota-core/publishing";

import { fastlaneSecretScopes } from "../fastlane-secret-policy";

function shipping(iosStoreDistribution: boolean): ShippingPlatformsDeclaration {
  return {
    schemaVersion: 1,
    android: {
      storeDistribution: true,
      productionTruth: "google-play",
    },
    ios: {
      storeDistribution: iosStoreDistribution,
      productionTruth: "app-store-connect",
      ...(iosStoreDistribution ? {} : { notLiveReason: "Not live." }),
    },
  };
}

assert.deepEqual(fastlaneSecretScopes([], shipping(false)), []);
assert.deepEqual(fastlaneSecretScopes(["android", "aab_unsigned"], shipping(false)), [
  "google-play",
]);
assert.deepEqual(fastlaneSecretScopes(["android", "production"], shipping(false)), [
  "google-play",
  "android-signing",
]);
assert.deepEqual(fastlaneSecretScopes(["ios", "build"], shipping(false)), [
  "ios-signing",
]);
assert.throws(
  () => fastlaneSecretScopes(["ios", "beta"], shipping(false)),
  /storeDistribution=false/,
);
assert.deepEqual(fastlaneSecretScopes(["ios", "beta"], shipping(true)), [
  "ios-signing",
  "app-store",
]);

console.log("Fastlane secret-scope policy tests passed.");
