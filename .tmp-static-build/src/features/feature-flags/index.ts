/** Single responsibility: expose capability-aware remote feature flags. */
export { featureFlags } from "./feature-flag-service";
export { FeatureFlagController } from "./FeatureFlagController";
export {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  featureFlag,
  type FeatureFlagCatalogEntry,
} from "./definitions";
export {
  featureFlagApiService,
  type FeatureFlagAdminEntry,
} from "./services/feature-flag-api-service";
export type {
  FeatureFlagDefinition,
  RemoteFeatureFlagProvider,
  RemoteFeatureFlagValues,
} from "./types";
