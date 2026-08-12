import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import {
  inspectNativeCompatibility,
  resolveNativeBaseline,
} from "./ota/ota-native-compatibility";
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
import { validateStorageProfilesAtStartup } from "../src/core/storage/profiles/storage-profile-validator";
import { validationEngine as categoryValidationEngine } from "../src/features/categories/infrastructure/validation.engine";

import { SRC, SCRIPTS, violations, walk, rel } from "./architecture-check/architecture-check.architecture-types";
import { checkFile, checkExternalDataAccessOwnership, checkGeneratedDataAccessArtifacts } from "./architecture-check/architecture-check.native-contract";
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
  }

  for (const file of walk(SCRIPTS)) {
    if (rel(file) === 'scripts/architecture-check.ts') continue;
    checkExternalDataAccessOwnership(file);
  }
  checkGeneratedDataAccessArtifacts();

  printReport();

  if (violations.length > 0) {
    process.exit(1);
  }

  console.log('All architecture checks passed.\n');
  // After the verdict, so a passing check still surfaces the store-release cost.
  reportNativeSurface();
}

main();
