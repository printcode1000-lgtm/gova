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
export { checkUiAttributeContract } from './checks/ui-attribute-contract';
export {
  DOM_IDENTITY_COVERAGE_EXCEPTIONS,
  checkDomIdentityCoverageContract,
  type DomIdentityCoverageException,
} from './checks/dom-identity-coverage-contract';
export { checkUiSimulationContract } from './checks/ui-simulation-contract';
export { checkPackageSealContract } from './checks/package-seal-contract';
export { checkCapabilityOwnershipContract } from './checks/capability-ownership-contract';
export { checkRepositorySweepContract } from './checks/repository-sweep-contract';
export type { ArchitectureCheckOptions } from './runner';
export { runArchitectureCheck } from './runner';

export {
  buildDomIdentityInventory,
  loadProjectTsx,
  findDescriptorLiterals,
  isInsideIteratorCallback,
  isActionableDomUsage,
  type DomIdentityInventory,
  type DomUsageSite,
  type DomUsageOwnership,
  type UiRegistrationKind,
  type DescriptorLiteral,
  type DescriptorLiteralField,
} from './dom-identity/analyzer';
export type { StaticInteractionMetadata, StaticSimulationMetadata } from './dom-identity/descriptor-literals';
export { planUidMigration, applyUidMigration, type UidMigrationEdit, type UidMigrationSkip, type UidMigrationPlan } from './dom-identity/migration';
export { fileSemanticPrefix, mintSemanticId, mintUid } from './dom-identity/mint';
export { hostMultiplicity, type HostMultiplicity } from './dom-identity/repetition';
export { collectUidCatalog, type UidCatalogEntry } from './dom-identity/uid-catalog';
export { findPendingAstSourceMatches, type PendingAstSourceMatch } from './dom-identity/pending-source-match';
export { readUiPageRegistryAst, type AstPageRegistryEntry } from './dom-identity/page-registry-reader';
export { reachableProjectFiles } from './dom-identity/project-reachability';
export { isIntrinsicJsxTag, jsxComponentName, localBindingTargets, parseTsx } from './dom-identity/tsx-ast';
