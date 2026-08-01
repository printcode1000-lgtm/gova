/**
 * Single responsibility: combine remotely controlled values with native-shell
 * capability checks, keeping unreleased UI dark by default.
 */
import { capabilities } from "@/native-platform";
import type {
  FeatureFlagDefinition,
  RemoteFeatureFlagProvider,
  RemoteFeatureFlagValues,
} from "./types";

let remoteValues: RemoteFeatureFlagValues = {};
let provider: RemoteFeatureFlagProvider | null = null;

export const featureFlags = {
  configureRemoteProvider(nextProvider: RemoteFeatureFlagProvider): void {
    provider = nextProvider;
  },
  setRemoteValues(values: RemoteFeatureFlagValues): void {
    remoteValues = { ...values };
  },
  async refresh(): Promise<void> {
    if (provider) remoteValues = { ...(await provider()) };
  },
  async isEnabled(definition: FeatureFlagDefinition): Promise<boolean> {
    const remotelyEnabled =
      remoteValues[definition.key] ?? definition.defaultEnabled ?? false;
    if (!remotelyEnabled) return false;
    return definition.capability
      ? capabilities.has(definition.capability)
      : true;
  },
} as const;
