/**
 * `@asol/architecture-core` — the architecture contract and the scan that enforces it.
 */
export * from './contracts/contract';
export * from './contracts/image-storage-contract';
export * from './contracts/notification-contract';
export {
  CAPABILITY_PACKAGES,
  OWNED_VENDOR_MODULES,
  ROOT_VENDOR_OWNED_FILES,
  packageByFolder,
  ownersOfVendor,
  rootVendorOwnerFolder,
  type CapabilityPackage,
  type PackageLayer,
} from './registry/capability-registry';
export {
  APPLICATION_FEATURES,
  APPROVED_SRC_ROOTS,
  FORBIDDEN_APP_ROOTS,
  FEATURE_INTERNAL_VOCABULARY,
  featureByName,
  featureDoorSpecifiers,
  isFeatureDoorSpecifier,
  type ApplicationFeature,
  type FeatureDoor,
  type FeatureRuntimeTarget,
} from './registry/application-features-registry';
export {
  COMPOSITION_FEATURE_SEAMS,
  isCompositionFeatureSeam,
  type CompositionFeatureSeamOwner,
} from './registry/composition-feature-seams-registry';
export {
  GENERATED_ARCHITECTURE_DOCS,
  renderArchitectureDoc,
  writeArchitectureDocs,
  diffArchitectureDocs,
  type ArchitectureDocId,
} from './docs/generate-architecture-docs';
export {
  GENERATED_FEATURE_SEAMS_DOC,
  renderFeatureSeamsDoc,
  writeFeatureSeamsDoc,
  diffFeatureSeamsDoc,
} from './docs/generate-feature-seams-doc';
export { violations } from './checks/architecture-types';
export { checkApplicationFeatureRegistryContract } from './checks/application-features-contract';
export { checkFeatureDoorContract } from './checks/feature-door-contract';
export { checkFeatureDependencyContract } from './checks/feature-dependency-contract';
export { checkFeatureApplicationDoorPurityContract } from './checks/feature-application-door-purity-contract';
export { checkArchitectureDocsDriftContract } from './checks/architecture-docs-drift-contract';
export { checkPackageSealContract } from './checks/package-seal-contract';
export { checkCapabilityOwnershipContract } from './checks/capability-ownership-contract';
export { checkRepositorySweepContract } from './checks/repository-sweep-contract';
export {
  checkStaticDomIdentityContract,
  formatStaticDomIdentityReport,
  scanStaticDomIdentities,
  stableStaticDomSuffix,
  writeStaticDomIdentityManifest,
  type StaticDomIdentityEntry,
  type StaticDomIdentityManifest,
  type StaticDomIdentityResult,
  type StaticDomIdentityViolation,
} from './checks/static-dom-identity-contract';
export type { ArchitectureCheckOptions } from './runner';
export { runArchitectureCheck } from './runner';

export {
  STATIC_DOM_RUNTIME_ID_REGISTRY,
  STATIC_DOM_RUNTIME_ID_SOURCE_ALLOWLIST,
  checkStaticDomRuntimeRegistryContract,
  formatStaticDomRuntimeRegistryReport,
  scanStaticDomRuntimeRegistry,
  type StaticDomRuntimeRegistryResult,
  type StaticDomRuntimeRegistryViolation,
  type StaticDomRuntimeRegistryViolationType,
} from './checks/static-dom-runtime-registry-contract';
