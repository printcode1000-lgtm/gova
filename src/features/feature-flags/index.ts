/** Single responsibility: expose capability-aware remote feature flags. */
export { featureFlags } from "./feature-flag-service";
export type {
  FeatureFlagDefinition,
  RemoteFeatureFlagProvider,
  RemoteFeatureFlagValues,
} from "./types";
