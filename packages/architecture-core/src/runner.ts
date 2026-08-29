import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { normalizePath } from './contracts/contract';
import { ROOT, SRC, SCRIPTS, violations, walk, rel } from './checks/architecture-types';
import { checkNotificationModuleContract } from './checks/notification-contract';
import { checkDeadContractRules } from './checks/storage-core-contract';
import { checkTouchInteractionContract } from './checks/touch-interaction-contract';
import { checkUiAttributeContract } from './checks/ui-attribute-contract';
import { checkDomIdentityCoverageContract } from './checks/dom-identity-coverage-contract';
import { checkUiSimulationContract } from './checks/ui-simulation-contract';
import { checkMapLibreWorkerContract } from './checks/maplibre-worker-contract';
import {
  checkFile,
  checkExternalDataAccessOwnership,
  checkGeneratedDataAccessArtifacts,
} from './checks/native-contract';
import { checkAccountBridgeContract } from './checks/account-bridge-contract';
import { checkPackageSealContract } from './checks/package-seal-contract';
import {
  checkSystemLogsBootstrapContract,
  checkSystemLogsContract,
} from './checks/system-logs-contract';
import { checkCapabilityOwnershipContract } from './checks/capability-ownership-contract';
import { checkPackageCycleContract } from './checks/package-cycle-contract';
import { checkPageSaveWriteGatewayContract } from './checks/page-save-write-gateway-contract';
import { checkRepositorySweepContract } from './checks/repository-sweep-contract';
import { checkPackageAppImportContract } from './checks/package-app-import-contract';
import { checkIsolatedDeploymentBackendContract } from './checks/isolated-deployment-backend-contract';
import { checkRuntimeTargetContract } from './checks/runtime-target-contract';
import { checkVendorOwnershipContract } from './checks/vendor-ownership-contract';
import { checkPageSaveGatewayContract } from './checks/page-save-gateway-contract';
import { checkApplicationFeatureRegistryContract } from './checks/application-features-contract';
import { checkFeatureDoorContract } from './checks/feature-door-contract';
import { checkFeatureDependencyContract } from './checks/feature-dependency-contract';
import { checkApplicationCycleContract } from './checks/application-cycle-contract';
import { checkRepositoryHygieneContract } from './checks/repository-hygiene-contract';
import { checkFeatureApplicationDoorPurityContract } from './checks/feature-application-door-purity-contract';
import { checkArchitectureDocsDriftContract } from './checks/architecture-docs-drift-contract';
import { printReport, reportNativeSurface } from './checks/file-analysis';
import { ROOT_VENDOR_OWNED_FILES } from './registry/capability-registry';

/**
 * The whole repository-wide architecture scan, as a function.
 *
 * The rules and the code that enforces them used to sit on opposite sides of the repository —
 * definitions under `src/core/architecture/`, enforcement under `scripts/architecture-check/` —
 * joined by relative imports that reached out of `scripts` and into the application source. The
 * tooling that enforces rule 5 was itself the clearest example of what rule 5 forbids.
 *
 * `preflight` is how the two checks that need the *application* stay out of this package: storage
 * profile validation and category data validation are passed in by the CLI, which is allowed to
 * know both.
 */
export interface ArchitectureCheckOptions {
  /** Run before the scan. Each returns an error list; a non-empty list aborts. */
  preflight?: ReadonlyArray<{ label: string; run: () => readonly string[] }>;
}

export function runArchitectureCheck(options: ArchitectureCheckOptions = {}): number {
  for (const step of options.preflight ?? []) {
    const errors = step.run();
    if (errors.length > 0) {
      console.error(`✖ ${step.label}`);
      for (const error of errors) console.error(error);
      return 1;
    }
  }

  checkCapabilityOwnershipContract();
  checkApplicationFeatureRegistryContract();
  checkPackageCycleContract();
  checkApplicationCycleContract();
  checkRepositoryHygieneContract();
  checkPageSaveGatewayContract();
  checkPageSaveWriteGatewayContract();
  checkRepositorySweepContract();
  checkIsolatedDeploymentBackendContract();
  checkRuntimeTargetContract();
  checkFeatureDoorContract();
  checkFeatureDependencyContract();
  checkFeatureApplicationDoorPurityContract();
  checkArchitectureDocsDriftContract();
  checkDomIdentityCoverageContract();
  checkUiSimulationContract();

  // Root files owned by a capability for vendor purposes (e.g. capacitor.config.ts).
  for (const rootFile of ROOT_VENDOR_OWNED_FILES) {
    const absolute = join(ROOT, rootFile.relativePath);
    if (!existsSync(absolute)) continue;
    const content = readFileSync(absolute, 'utf8');
    checkVendorOwnershipContract(absolute, content);
  }

  for (const file of walk(SRC)) {
    const content = readFileSync(file, 'utf8');
    checkFile(file);
    checkPackageSealContract(file, content);
    checkSystemLogsContract(file, content);
    checkVendorOwnershipContract(file, content);
  }

  // `packages/` was never walked by this check. Every sealed package's own source was
  // therefore exempt from the repository-wide scan that rule 5 relies on — which is how
  // one package came to reach another by relative path without anything noticing.
  const packagesDir = join(ROOT, 'packages');
  if (existsSync(packagesDir)) {
    for (const file of walk(packagesDir)) {
      if (file.includes('node_modules')) continue;
      // This package holds the rules, so its own contract files quote every pattern the scan
      // looks for. Scanning them reports the rule text itself as a violation.
      if (normalizePath(file).includes('packages/architecture-core/src/contracts/')) continue;
      if (normalizePath(file).includes('packages/architecture-core/src/registry/')) continue;
      const content = readFileSync(file, 'utf8');
      checkPackageSealContract(file, content);
      checkPackageAppImportContract(file, content);
      checkVendorOwnershipContract(file, content);
    }
  }

  for (const file of walk(SCRIPTS)) {
    if (rel(file) === 'scripts/architecture-check.ts') continue;
    const content = readFileSync(file, 'utf8');
    checkExternalDataAccessOwnership(file);
    checkAccountBridgeContract(file, content);
    checkPackageSealContract(file, content);
    checkVendorOwnershipContract(file, content);
  }
  checkTouchInteractionContract();
  checkUiAttributeContract();
  checkMapLibreWorkerContract();
  checkGeneratedDataAccessArtifacts();
  checkSystemLogsBootstrapContract();

  const fileContents = new Map<string, string>();
  for (const file of walk(SRC)) {
    fileContents.set(file, readFileSync(file, 'utf8'));
  }
  for (const file of walk(SCRIPTS)) {
    fileContents.set(file, readFileSync(file, 'utf8'));
  }
  checkDeadContractRules(fileContents);

  const servicesDir = join(ROOT, 'services');
  if (existsSync(servicesDir)) {
    for (const file of walk(servicesDir)) {
      const normalized = normalizePath(file);
      if (normalized.includes('node_modules')) continue;
      if (normalized.includes('/generated/')) continue;
      const content = readFileSync(file, 'utf8');
      checkAccountBridgeContract(file, content);
      checkPackageSealContract(file, content);
      checkVendorOwnershipContract(file, content);
      if (normalized.includes('services/notifications/src')) {
        checkNotificationModuleContract(file, content);
      }
    }
  }

  printReport();
  if (violations.length > 0) return 1;

  console.log('All architecture checks passed.\n');
  // After the verdict, so a passing check still surfaces the store-release cost.
  reportNativeSurface();
  return 0;
}
