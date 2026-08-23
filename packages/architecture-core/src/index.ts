/**
 * `@asol/architecture-core` — the architecture contract and the scan that enforces it.
 *
 * The rules are data (`contracts/` + `registry/`), the enforcement is code (`checks/`), and both
 * now live in one sealed package instead of straddling `src/` and `scripts/`.
 * `scripts/architecture-check.ts` is the CLI: it supplies the two preflight validations that need
 * the application itself, and exits with whatever this returns.
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
  FEATURE_DEEP_IMPORT_SEAMS,
  isFeatureDeepImportSeam,
  type FeatureDeepImportSeamOwner,
} from './registry/feature-deep-import-seams-registry';
export {
  GENERATED_ARCHITECTURE_DOCS,
  renderArchitectureDoc,
  writeArchitectureDocs,
  diffArchitectureDocs,
  type ArchitectureDocId,
} from './docs/generate-architecture-docs';
export { violations } from './checks/architecture-types';
export { checkApplicationFeatureRegistryContract } from './checks/application-features-contract';
export { checkFeatureDoorContract } from './checks/feature-door-contract';
export { checkFeatureDependencyContract } from './checks/feature-dependency-contract';
export { checkFeatureApplicationDoorPurityContract } from './checks/feature-application-door-purity-contract';
export { checkArchitectureDocsDriftContract } from './checks/architecture-docs-drift-contract';
export { checkPackageSealContract } from './checks/package-seal-contract';
export { checkCapabilityOwnershipContract } from './checks/capability-ownership-contract';
export { checkRepositorySweepContract } from './checks/repository-sweep-contract';
export type { ArchitectureCheckOptions } from './runner';
export { runArchitectureCheck } from './runner';
