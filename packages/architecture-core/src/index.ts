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
  packageByFolder,
  ownersOfVendor,
  type CapabilityPackage,
  type PackageLayer,
} from './registry/capability-registry';
export type { ArchitectureCheckOptions } from './runner';
export { runArchitectureCheck } from './runner';
