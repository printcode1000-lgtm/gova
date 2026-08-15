/**
 * Single responsibility: combine remotely controlled values with native-shell
 * capability checks, keeping unreleased UI dark by default.
 */
import { capabilities } from '@asol/native-core';
import type { CapabilityKey } from '@asol/native-core';
import type {
  FeatureFlagDefinition,
  RemoteFeatureFlagProvider,
  RemoteFeatureFlagValues,
} from "./types";

type CapabilityLookup = (capability: CapabilityKey) => Promise<boolean>;

export class FeatureFlagService {
  private remoteValues: RemoteFeatureFlagValues = {};
  private provider: RemoteFeatureFlagProvider | null = null;

  constructor(
    private readonly hasCapability: CapabilityLookup = (key) =>
      capabilities.has(key),
  ) {}

  configureRemoteProvider(nextProvider: RemoteFeatureFlagProvider): void {
    this.provider = nextProvider;
  }

  setRemoteValues(values: RemoteFeatureFlagValues): void {
    this.remoteValues = { ...values };
  }

  async refresh(): Promise<void> {
    if (!this.provider) return;
    // Propagate provider failures so bootstrap can report them; assignment after
    // the await deliberately preserves the last known-good values.
    this.remoteValues = { ...(await this.provider()) };
  }

  async isEnabled(definition: FeatureFlagDefinition): Promise<boolean> {
    const remotelyEnabled =
      this.remoteValues[definition.key] ?? definition.defaultEnabled ?? false;
    if (!remotelyEnabled) return false;
    return definition.capability
      ? this.hasCapability(definition.capability)
      : true;
  }

  /** Test/bootstrap support for returning the service to its initial state. */
  reset(): void {
    this.remoteValues = {};
    this.provider = null;
  }
}

export const featureFlags = new FeatureFlagService();
