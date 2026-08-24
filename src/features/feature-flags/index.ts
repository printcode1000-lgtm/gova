/** Single responsibility: expose capability-aware remote feature flags. */
export { featureFlags } from "./application/feature-flag-service";
export { FeatureFlagController } from "./presentation/FeatureFlagController";
export {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  featureFlag,
  type FeatureFlagCatalogEntry,
} from "./application/definitions";
export {
  featureFlagApiService,
  type FeatureFlagAdminEntry,
} from "./application/services/feature-flag-api-service";
export type {
  FeatureFlagDefinition,
  RemoteFeatureFlagProvider,
  RemoteFeatureFlagValues,
} from "./application/types";
