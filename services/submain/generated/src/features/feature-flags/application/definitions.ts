/**
 * Single responsibility: name every remotely controllable feature once.
 *
 * A flag here is the only switch that works **without** publishing anything:
 * OTA replaces the web bundle, and a store release needs review, but flipping a
 * row in `feature_flags` reaches devices on their next refresh.
 *
 * Flags that name a `capability` are answered with AND: remotely enabled *and*
 * present in the installed shell. That is what makes a platform-optional
 * capability safe to ship — `barcode.scan` exists only on Android, so the flag
 * stays dark on iOS no matter what the server says.
 */
import { CapabilityKeys } from '@asol/native-core/capability-keys';
import type { FeatureFlagDefinition } from "./types";

export interface FeatureFlagCatalogEntry extends FeatureFlagDefinition {
  /** Shown in the super-admin console; explain the user-visible effect. */
  description: string;
}

export const FEATURE_FLAGS: readonly FeatureFlagCatalogEntry[] = Object.freeze([
  {
    key: "barcode.scanner",
    description:
      "Barcode and QR scanning entry points. Android only — the iOS shell has no scanner plugin.",
    capability: CapabilityKeys.BarcodeScan,
    defaultEnabled: true,
  },
  {
    key: "camera.capture",
    description: "Taking a photo with the device camera.",
    capability: CapabilityKeys.CameraTakePhoto,
    defaultEnabled: true,
  },
  {
    key: "location.picker",
    description: "Reading the device location for addresses and delivery.",
    capability: CapabilityKeys.LocationCurrent,
    defaultEnabled: true,
  },
  {
    key: "speech.voiceInput",
    description: "Voice-to-text input on supported fields.",
    capability: CapabilityKeys.SpeechRecognize,
    defaultEnabled: true,
  },
  {
    key: "share.receive",
    description: "Accepting content shared into ASOL from other applications.",
    capability: CapabilityKeys.ShareReceive,
    defaultEnabled: true,
  },
  {
    key: "notifications.push",
    description: "Registering for and displaying push notifications.",
    capability: CapabilityKeys.NotificationsPush,
    defaultEnabled: true,
  },
]);

export const FEATURE_FLAG_KEYS = Object.freeze(
  FEATURE_FLAGS.map((definition) => definition.key),
);

/** Look a flag up by key so callers never retype a string literal. */
export function featureFlag(key: string): FeatureFlagCatalogEntry {
  const definition = FEATURE_FLAGS.find((entry) => entry.key === key);
  if (!definition) throw new Error(`Unknown feature flag: ${key}`);
  return definition;
}
