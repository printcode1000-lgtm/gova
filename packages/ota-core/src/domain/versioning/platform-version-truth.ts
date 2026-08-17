import {
  assertNativeVersion,
  releaseContentVersion,
  nextContentVersion,
} from "./content-version";
import { compareOtaVersions } from "./version-ordering";
import { nextNativePatchVersion } from "./native-version";

export type AndroidNativeVersionAction = "current" | "next-patch";

export interface AndroidNativeVersionPlan {
  productionVersion: string;
  targetVersion: string;
  contentVersion: string;
  correctedFromLocal?: string;
}

export function planAndroidNativeTarget(
  productionVersion: string,
  action: AndroidNativeVersionAction,
  hasNativeChanges: boolean,
): string {
  assertNativeVersion(productionVersion);
  if (action === "current") {
    if (hasNativeChanges) {
      throw new Error(
        [
          `Refusing to keep Android version ${productionVersion}: this build contains compiled native changes.`,
          "",
          "A native change makes a different shell. Keeping the version would give two",
          "different binaries the same identity — Google Play rejects the duplicate",
          "versionCode, and no device could tell them apart.",
          "",
          "Choose a new Android patch version instead:",
          "  --native-version=next-patch",
        ].join("\n"),
      );
    }
    return productionVersion;
  }
  return nextNativePatchVersion(productionVersion);
}

export function planAndroidNativeVersion(
  productionVersion: string,
  action: AndroidNativeVersionAction,
  hasNativeChanges: boolean,
  localVersion?: string | null,
): AndroidNativeVersionPlan {
  const targetVersion = planAndroidNativeTarget(
    productionVersion,
    action,
    hasNativeChanges,
  );
  return {
    productionVersion,
    targetVersion,
    contentVersion: releaseContentVersion(targetVersion),
    correctedFromLocal:
      localVersion && localVersion !== targetVersion ? localVersion : undefined,
  };
}

/** Next OTA is always derived from the last manifest actually published on R2. */
export function planOtaTargetVersion(
  lastPublishedOnR2: string | null,
  nativeLine: string,
): string {
  assertNativeVersion(nativeLine);
  return nextContentVersion(lastPublishedOnR2, nativeLine);
}

/**
 * Local OTA numbers that were never published on R2 must not advance the target.
 * Returns the stable next OTA derived only from R2 truth.
 */
export function reconcileOtaTargetWithR2(
  lastPublishedOnR2: string | null,
  nativeLine: string,
  localContentVersion: string | null,
): { target: string; correctedFromLocal?: string } {
  const target = planOtaTargetVersion(lastPublishedOnR2, nativeLine);
  if (!localContentVersion || compareOtaVersions(localContentVersion, target) <= 0) {
    return { target };
  }
  return { target, correctedFromLocal: localContentVersion };
}
