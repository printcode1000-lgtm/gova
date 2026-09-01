import assert from "node:assert/strict";

import {
  parseShippingPlatformsDeclaration,
  type ShippingPlatformsDeclaration,
} from "../publishing/config/shipping-platforms";
import {
  PlatformTruthError,
  resolveOtaNativeCompatibilityLine,
} from "../publishing/truth/store-production-truth";

function declaration(
  androidLive: boolean,
  iosLive: boolean,
): ShippingPlatformsDeclaration {
  return parseShippingPlatformsDeclaration({
    schemaVersion: 1,
    android: {
      storeDistribution: androidLive,
      productionTruth: "google-play",
      notLiveReason: androidLive ? undefined : "android test disabled",
    },
    ios: {
      storeDistribution: iosLive,
      productionTruth: "app-store-connect",
      notLiveReason: iosLive ? undefined : "ios test disabled",
    },
  });
}

export async function runStoreProductionTruthTests(): Promise<void> {
  const same = await resolveOtaNativeCompatibilityLine({
    declaration: declaration(true, true),
    readers: {
      android: async () => "1.2.0",
      ios: async () => "1.2.0",
    },
  });
  assert.equal(same.minimumNativeVersion, "1.2.0");
  assert.deepEqual(same.enabledPlatforms, ["android", "ios"]);

  const iosOlder = await resolveOtaNativeCompatibilityLine({
    declaration: declaration(true, true),
    readers: {
      android: async () => "1.3.0",
      ios: async () => "1.1.0",
    },
  });
  assert.equal(iosOlder.minimumNativeVersion, "1.1.0", "iOS older than Android uses the lower line");

  const androidOlder = await resolveOtaNativeCompatibilityLine({
    declaration: declaration(true, true),
    readers: {
      android: async () => "1.0.0",
      ios: async () => "1.4.0",
    },
  });
  assert.equal(androidOlder.minimumNativeVersion, "1.0.0", "Android older than iOS uses the lower line");

  await assert.rejects(
    () =>
      resolveOtaNativeCompatibilityLine({
        declaration: declaration(true, true),
        readers: { android: async () => "1.2.0" },
        credentialsReady: { ios: false },
      }),
    (error: unknown) =>
      error instanceof PlatformTruthError &&
      error.platform === "ios" &&
      /App Store Connect credentials/.test(error.message),
    "Missing credentials for an enabled platform fail closed",
  );

  const iosDisabled = await resolveOtaNativeCompatibilityLine({
    declaration: declaration(true, false),
    readers: { android: async () => "2.0.0" },
    credentialsReady: { ios: false },
  });
  assert.equal(iosDisabled.minimumNativeVersion, "2.0.0");
  assert.equal(iosDisabled.iosProduction, undefined);
  assert.deepEqual(iosDisabled.enabledPlatforms, ["android"]);

  await assert.rejects(
    () =>
      resolveOtaNativeCompatibilityLine({
        declaration: declaration(true, true),
        readers: {
          android: async () => "1.0.0",
          ios: async () => {
            throw new Error("no published store version");
          },
        },
      }),
    (error: unknown) =>
      error instanceof PlatformTruthError && error.platform === "ios",
    "No published store version fails that platform only",
  );

  await assert.rejects(
    () =>
      resolveOtaNativeCompatibilityLine({
        declaration: declaration(true, true),
        readers: {
          android: async () => "0.0.1",
          ios: async () => "0.0.1",
        },
        requiredCapabilities: ["BarcodeScan"],
        platformCapabilities: {
          android: ["BarcodeScan"],
          ios: [],
        },
      }),
    (error: unknown) =>
      error instanceof PlatformTruthError &&
      error.platform === "ios" &&
      /BarcodeScan/.test(error.message),
  );

  await assert.rejects(
    () =>
      resolveOtaNativeCompatibilityLine({
        declaration: declaration(true, true),
        readers: {
          android: async () => {
            throw new Error("android network");
          },
          ios: async () => "1.0.0",
        },
      }),
    (error: unknown) =>
      error instanceof PlatformTruthError &&
      error.platform === "android" &&
      /android network/.test(error.message),
    "Android and iOS API failures stay separate",
  );

  let uploaded = false;
  try {
    await resolveOtaNativeCompatibilityLine({
      declaration: declaration(true, true),
      readers: { android: async () => "1.2.0" },
      credentialsReady: { ios: false },
    });
    uploaded = true;
  } catch {
    uploaded = false;
  }
  assert.equal(uploaded, false, "A failed platform gate must not continue to upload");

  console.log("  ✔ store production truth and OTA eligibility tests passed");
}
