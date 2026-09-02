/** Single responsibility: describe remote flags guarded by native capabilities. */
import type { CapabilityKey } from '@asol/native-core/capability-keys';
export interface FeatureFlagDefinition {
  key: string;
  capability?: CapabilityKey;
  defaultEnabled?: boolean;
}
export type RemoteFeatureFlagValues = Readonly<Record<string, boolean>>;
export type RemoteFeatureFlagProvider = () => Promise<RemoteFeatureFlagValues>;
