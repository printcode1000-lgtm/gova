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
} from "../../src/core/architecture/contract";
import {
  IMAGE_STORAGE_API_ADAPTER,
  IMAGE_STORAGE_API_ADAPTER_ALLOWED_IMPORTERS,
  IMAGE_STORAGE_FORBIDDEN_PATTERN_EXEMPT,
  IMAGE_STORAGE_FORBIDDEN_PATTERNS,
  IMAGE_STORAGE_LEGACY_BLOB_UPLOAD_FILES,
  IMAGE_STORAGE_SERVER_UPLOAD_ROUTE,
  R2_S3_CLIENT_ALLOWED_IMPORTERS,
  R2_S3_CLIENT_MODULE,
} from "../../src/core/architecture/image-storage-contract";
import { validateStorageProfilesAtStartup } from "@asol/storage-core/server";
import { validationEngine as categoryValidationEngine } from "../../src/features/categories/infrastructure/validation.engine";

import { violations, addViolation } from "./architecture-check.architecture-types";

export function checkImageStorageContract(fileRel: string, content: string, filePath: string): void {
  if (!IMAGE_STORAGE_FORBIDDEN_PATTERN_EXEMPT.has(fileRel)) {
    for (const { pattern, message } of IMAGE_STORAGE_FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        addViolation('Image Storage Contract', filePath, message, 'Use the shared Image Storage pipeline.');
      }
    }
  }

  if (/from\s+['"]@\/core\/provisioning\/r2-s3-client['"]/.test(content) && !R2_S3_CLIENT_ALLOWED_IMPORTERS.has(fileRel)) {
    addViolation(
      'Image Storage Contract',
      filePath,
      'R2 S3 client imported outside Provider Layer.',
      `${R2_S3_CLIENT_MODULE} → CloudflareR2Provider only.`
    );
  }

  if (content.includes(IMAGE_STORAGE_API_ADAPTER) && !IMAGE_STORAGE_API_ADAPTER_ALLOWED_IMPORTERS.has(fileRel)) {
    const importsApiAdapter =
      new RegExp(`from\\s+['"][^'"]*${IMAGE_STORAGE_API_ADAPTER}['"]`).test(content) ||
      new RegExp(`import\\(\\s*['"][^'"]*${IMAGE_STORAGE_API_ADAPTER}['"]`).test(content);
    if (importsApiAdapter) {
      addViolation(
        'Image Storage Contract',
        filePath,
        'Direct ImageStorageApiService import from UI or feature code.',
        'Use ImageStorageService only.'
      );
    }
  }

  const usesLegacyBlobUpload =
    /<BlobImageUpload[\s/>]/.test(content) ||
    /import\s*\{[^}]*\bBlobImageUpload\b[^}]*\}/.test(content);
  if (
    usesLegacyBlobUpload &&
    !IMAGE_STORAGE_LEGACY_BLOB_UPLOAD_FILES.has(fileRel) &&
    fileRel !== 'src/components/onboarding/form-components.tsx'
  ) {
    addViolation(
      'Image Storage Contract',
      filePath,
      'BlobImageUpload is forbidden outside legacy allowlist.',
      'Use StorageImageManager + StorageProfiles.*.'
    );
  }

  if (fileRel === IMAGE_STORAGE_SERVER_UPLOAD_ROUTE) {
    if (
      !content.includes('imageUploadApplicationService') &&
      !content.includes('image-storage-service.bootstrap.server')
    ) {
      addViolation(
        'Image Storage Contract',
        filePath,
        'Upload API must delegate to ImageUploadApplicationService.',
        'Business API → Application Layer only.'
      );
    }
  }

  const isUiOrHook =
    fileRel.startsWith('src/components/') ||
    fileRel.startsWith('src/app/') && !fileRel.startsWith('src/app/api/') ||
    fileRel.includes('/hooks/');

  if (isUiOrHook && /\/api\/storage\/images\/upload/.test(content)) {
    addViolation(
      'Image Storage Contract',
      filePath,
      'Direct upload API call from UI layer.',
      'Use ImageStorageService → ImageStorageApiService.'
    );
  }
}

export function getAllowedHint(layer: ArchitectureLayer, target: ArchitectureLayer | 'forbidden-package'): string {
  const hints: Partial<Record<ArchitectureLayer, string>> = {
    ui: 'UI → Hooks only.',
    hooks: 'Hooks → Client Services only.',
    'client-services': 'Client Services → AsolApiClient only.',
    'business-api': 'Business API → Server Services only.',
    'server-services': 'Server Services → Query / Command only.',
    operations: 'Query / Command → Repository only.',
    repository: 'Repository → Database Client only.',
  };
  return hints[layer] ?? 'Follow the Architecture Contract layer order.';
}

export function printReport(): void {
  const checks = [
    'UI Layer',
    'Hooks Layer',
    'Client Services',
    'AsolApiClient',
    'Business APIs',
    'Server Services',
    'Query Layer',
    'Command Layer',
    'Repository Layer',
    'Database Client',
    'SQLite Rules',
    'Turso Rules',
    'No SQL Outside Repository',
    'No fetch Outside AsolApiClient',
    'No Secrets In Client',
    'No Drizzle Outside Repository',
    'No Invalid Imports',
    'Configuration Layer',
    'Image Storage Contract',
    'Category Module Contract',
    'Native Platform Contract',
  ];

  const failedCategories = new Set(violations.map((v) => v.layer));
  const score = Math.round(((checks.length - Math.min(failedCategories.size, checks.length)) / checks.length) * 100);

  console.log('\nArchitecture Report\n');

  for (const check of checks) {
    const failed = [...failedCategories].some((c) => check.toLowerCase().includes(c.split(' ')[0].toLowerCase()));
    console.log(`${failed ? '✖' : '✔'} ${check}`);
  }

  console.log(`\nArchitecture Score\n\n${score}%\n`);

  if (violations.length > 0) {
    console.log('Architecture Violations\n');
    for (const v of violations) {
      console.log(`Layer:\n${v.layer}\n\nFile:\n${v.file}\n\nViolation:\n${v.violation}\n`);
      if (v.allowed) console.log(`Allowed:\n${v.allowed}\n`);
      console.log('---\n');
    }
    console.log('Build Failed.\n');
  }
}

export function reportNativeSurface(): void {
  let report;
  try {
    report = inspectNativeCompatibility(resolveNativeBaseline());
  } catch {
    return; // No git, no baseline: nothing can be said, so say nothing.
  }
  if (report.baselineMissing) return;

  const changed = [...report.changedPaths, ...report.changedNativeDependencies];
  if (changed.length === 0) return;

  console.log('\nNative Surface\n');
  console.log(
    `${changed.length} native surface(s) changed since the last store release.`,
  );
  for (const path of changed) console.log(`  - ${path}`);
  console.log(
    '\nThis is not an architecture violation and does not fail the check.\n' +
      'It means `ota:publish` will refuse until you either ship a store build\n' +
      'and re-tag the baseline, or declare the minimum native version because\n' +
      'the plugin is already compiled into the installed shell.\n',
  );
}
