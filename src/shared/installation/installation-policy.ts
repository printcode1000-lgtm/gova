export const INSTALLATION_STATE_SCHEMA_VERSION = 1;

export type InstallationOrigin = "fresh" | "legacy";

export interface InstallationState {
  schemaVersion: number;
  origin: InstallationOrigin;
  firstSeenBundleVersion: string;
  lastSeenBundleVersion: string;
  initializedAt: string;
  lastUpdatedAt: string;
}

export type InstallationDecision = "fresh" | "adopt-legacy" | "update";

export function decideInstallationInitialization(input: {
  storedState: InstallationState | null;
  hasExistingClientData: boolean;
}): InstallationDecision {
  if (input.storedState) return "update";
  return input.hasExistingClientData ? "adopt-legacy" : "fresh";
}

export function createInstallationState(input: {
  decision: InstallationDecision;
  bundleVersion: string;
  now: string;
  previous?: InstallationState | null;
}): InstallationState {
  if (input.decision === "update" && input.previous) {
    return {
      ...input.previous,
      schemaVersion: INSTALLATION_STATE_SCHEMA_VERSION,
      lastSeenBundleVersion: input.bundleVersion,
      lastUpdatedAt: input.now,
    };
  }

  return {
    schemaVersion: INSTALLATION_STATE_SCHEMA_VERSION,
    origin: input.decision === "fresh" ? "fresh" : "legacy",
    firstSeenBundleVersion: input.bundleVersion,
    lastSeenBundleVersion: input.bundleVersion,
    initializedAt: input.now,
    lastUpdatedAt: input.now,
  };
}
