import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import {
  inspectNativeCompatibility,
  resolveNativeBaseline,
} from "@asol/ota-core/publishing";
import {
  ALLOWED_DRIZZLE_ORM_FILES_PATTERN,
  ALLOWED_DB_DRIVER_FILES_PATTERN,
  ALLOWED_FETCH_FILES,
  ALLOWED_PROCESS_ENV_FILES,
  ALLOWED_SQL_FILES_PATTERN,
  DIRECT_DATABASE_CALL_PATTERNS,
  LAYER_LABELS,
  RAW_SQL_PATTERNS,
  classifyLayer,
  getForbiddenImportViolation,
  importTargetLayer,
  isClientComponent,
  isServerOnlyModule,
  normalizePath,
  type ArchitectureLayer,
} from "../src/core/architecture/contract";
import {
  IMAGE_STORAGE_API_ADAPTER,
  IMAGE_STORAGE_API_ADAPTER_ALLOWED_IMPORTERS,
  IMAGE_STORAGE_FORBIDDEN_PATTERN_EXEMPT,
  IMAGE_STORAGE_FORBIDDEN_PATTERNS,
  IMAGE_STORAGE_LEGACY_BLOB_UPLOAD_FILES,
  IMAGE_STORAGE_SERVER_UPLOAD_ROUTE,
  R2_S3_CLIENT_ALLOWED_IMPORTERS,
  R2_S3_CLIENT_MODULE,
} from "../src/core/architecture/image-storage-contract";
import { validateStorageProfilesAtStartup } from "@asol/storage-core/server";
import { validationEngine as categoryValidationEngine } from "../src/features/categories/infrastructure/validation.engine";

import { ROOT, SRC, SCRIPTS, violations, walk, rel } from "./architecture-check/architecture-check.architecture-types";
import { checkNotificationModuleContract } from "./architecture-check/architecture-check.notification-contract";
import { checkDeadContractRules } from "./architecture-check/architecture-check.storage-core-contract";
import { checkFile, checkExternalDataAccessOwnership, checkGeneratedDataAccessArtifacts } from "./architecture-check/architecture-check.native-contract";
import { checkAccountBridgeContract } from "./architecture-check/architecture-check.account-bridge-contract";
import { checkPackageSealContract } from "./architecture-check/architecture-check.package-seal-contract";
import { printReport, reportNativeSurface } from "./architecture-check/architecture-check.file-analysis";

function main(): void {
  try {
    validateStorageProfilesAtStartup();
  } catch (error) {
    console.error('✖ storage-profiles.json validation failed');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const categoryValidation = categoryValidationEngine.validate();
  if (!categoryValidation.valid) {
    console.error('✖ category data validation failed');
    for (const error of categoryValidation.errors) console.error(error);
    process.exit(1);
  }

  const files = walk(SRC);
  for (const file of files) {
    if (normalizePath(file).includes('/architecture/contract.ts')) continue;
    checkFile(file);
    checkPackageSealContract(file, readFileSync(file, 'utf8'));
  }

  // `packages/` was never walked by this check. Every sealed package's own source was
  // therefore exempt from the repository-wide scan that rule 5 relies on — which is how
  // one package came to reach another by relative path without anything noticing.
  const packagesDir = join(ROOT, 'packages');
  if (existsSync(packagesDir)) {
    for (const file of walk(packagesDir)) {
      if (file.includes('node_modules')) continue;
      checkPackageSealContract(file, readFileSync(file, 'utf8'));
    }
  }

  for (const file of walk(SCRIPTS)) {
    if (rel(file) === 'scripts/architecture-check.ts') continue;
    checkExternalDataAccessOwnership(file);
    checkAccountBridgeContract(file, readFileSync(file, 'utf8'));
    checkPackageSealContract(file, readFileSync(file, 'utf8'));
  }
  checkGeneratedDataAccessArtifacts();

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
      if (file.includes('node_modules')) continue;
      const content = readFileSync(file, 'utf8');
      checkAccountBridgeContract(file, content);
      checkPackageSealContract(file, content);
      if (file.includes('services/notifications/src')) {
        checkNotificationModuleContract(file, content);
      }
    }
  }

  printReport();

  if (violations.length > 0) {
    process.exit(1);
  }

  console.log('All architecture checks passed.\n');
  // After the verdict, so a passing check still surfaces the store-release cost.
  reportNativeSurface();
}

main();
