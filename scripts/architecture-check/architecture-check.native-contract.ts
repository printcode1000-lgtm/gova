import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import {
  inspectNativeCompatibility,
  resolveNativeBaseline,
} from "../ota/ota-native-compatibility";
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
import { validateStorageProfilesAtStartup } from "../../src/core/storage/profiles/storage-profile-validator";
import { validationEngine as categoryValidationEngine } from "../../src/features/categories/infrastructure/validation.engine";

import { PUBLIC_PUSH_WORKER, PUSH_WORKER_SOURCE, STRUCTURED_CATEGORY_COLUMN_FILES, rel, addViolation, checkNativePlatformContract, matchesAny, extractImports } from "./architecture-check.architecture-types";
import { checkImageStorageContract, getAllowedHint } from "./architecture-check.file-analysis";

export function checkFile(filePath: string): void {
  const content = readFileSync(filePath, 'utf8');
  const fileRel = rel(filePath);
  const layer = classifyLayer(fileRel);
  const isClient = isClientComponent(content);
  const isServerOnly = isServerOnlyModule(content);
  const isAllowedProcessEnvFile =
    ALLOWED_PROCESS_ENV_FILES.has(fileRel) ||
    fileRel.startsWith('src/core/config/server-env/');

  checkCategoryModuleContract(fileRel, content, filePath);

  if (
    content.includes('process.env') &&
    !isAllowedProcessEnvFile &&
    layer !== 'provisioning' &&
    layer !== 'database-client'
  ) {
    addViolation(
      'configuration',
      filePath,
      'process.env used outside Configuration layer.',
      'Import values from @/core/config instead.'
    );
  }

  if (
    /\bfetch\s*\(/.test(content) &&
    !ALLOWED_FETCH_FILES.has(fileRel) &&
    layer !== 'provisioning'
  ) {
    addViolation(
      'asol-api-client',
      filePath,
      'fetch() used outside asol-http-transport.ts.',
      'Use asolApi from @/core/api.'
    );
  }

  if (/\baxios\b/.test(content)) {
    if (/from\s+['"]axios['"]/.test(content) || /require\(['"]axios['"]\)/.test(content)) {
      addViolation('asol-api-client', filePath, 'Direct HTTP client used outside AsolApiClient.', 'Use asolApi.');
    }
  }
  if (/\bXMLHttpRequest\b/.test(content) && !/LAYER_LABELS|Architecture Contract|Forbidden/.test(content)) {
    addViolation('asol-api-client', filePath, 'Direct HTTP client used outside AsolApiClient.', 'Use asolApi.');
  }

  if (/from\s+['"]drizzle-orm/.test(content) || /require\(['"]drizzle-orm/.test(content)) {
    if (!matchesAny(fileRel, ALLOWED_DRIZZLE_ORM_FILES_PATTERN)) {
      addViolation(
        'repository',
        filePath,
        'drizzle-orm imported outside Repository / Database Client.',
        'Repository and Database Client only.'
      );
    }
  }

  if (/from\s+['"]better-sqlite3['"]/.test(content) || /from\s+['"]@libsql\//.test(content)) {
    if (!matchesAny(fileRel, ALLOWED_DB_DRIVER_FILES_PATTERN)) {
      addViolation(
        'database-client',
        filePath,
        'Database driver imported outside Database Client / Provisioning.',
        'Database Client only.'
      );
    }
  }

  if (
    /\b(?:window\.)?indexedDB\s*\./.test(content) &&
    !fileRel.startsWith('src/modules/data-access/browser/')
  ) {
    addViolation(
      'database-client',
      filePath,
      'IndexedDB accessed outside the central Data Access browser adapter.',
      'Use @/modules/data-access/browser.'
    );
  }

  const strippedContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  if (RAW_SQL_PATTERNS.some((pattern) => pattern.test(strippedContent)) && !matchesAny(fileRel, ALLOWED_SQL_FILES_PATTERN)) {
    addViolation('repository', filePath, 'Raw SQL detected outside Repository / Database Client.', 'Repository only.');
  }
  if (
    DIRECT_DATABASE_CALL_PATTERNS.some((pattern) => pattern.test(strippedContent)) &&
    !fileRel.startsWith('src/modules/data-access/')
  ) {
    addViolation(
      'database-client',
      filePath,
      'Direct database execution detected outside the central Data Access module.',
      'Call a typed data-access query or command.',
    );
  }

  const secretPatterns = [
    'TURSO_API_TOKEN',
    'TURSO_AUTH_TOKEN',
    'TURSO_DATABASE_URL',
    'TURSO_PRODUCT_DATABASE_URL',
    'TURSO_PRODUCT_AUTH_TOKEN',
    'TURSO_ADVERTISEMENTS_DATABASE_URL',
    'TURSO_ADVERTISEMENTS_AUTH_TOKEN',
    '_DATABASE_URL',
    '_DATABASE_AUTH_TOKEN',
    'R2_API_TOKEN',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'VERCEL_TOKEN',
    'VERCEL_ORG_ID',
  ];
  if (!isServerOnly && !isAllowedProcessEnvFile && layer !== 'provisioning' && layer !== 'database-client') {
    for (const secret of secretPatterns) {
      if (content.includes(secret)) {
        addViolation('configuration', filePath, `Secret reference "${secret}" in client-accessible file.`, 'Server config only.');
      }
    }
  }

  if (isClient) {
    if (isServerOnly) {
      addViolation(layer, filePath, 'Client Component imports server-only module.', 'UI → Hooks → Client Services only.');
    }
    for (const imp of extractImports(content)) {
      const target = importTargetLayer(imp);
      if (target === 'repository' || target === 'operations' || target === 'server-services' || target === 'database-client') {
        addViolation(layer, filePath, `Client Component imports ${imp}.`, 'Use Client Services + AsolApiClient.');
      }
      if (imp === 'server-only') {
        addViolation(layer, filePath, 'Client Component imports server-only.', 'Forbidden.');
      }
    }
  }

  if (isServerOnly && (layer === 'ui' || layer === 'hooks' || layer === 'client-services')) {
    addViolation(layer, filePath, 'Client layer file marked server-only.', 'Remove server-only from client code.');
  }

  if (layer === 'server-services' || layer === 'business-api' || layer === 'operations' || layer === 'repository') {
    for (const imp of extractImports(content)) {
      if (imp.startsWith('@/components/') || imp.includes('/hooks/')) {
        addViolation(layer, filePath, `Server layer imports client module "${imp}".`, 'Server must not import UI/Hooks.');
      }
      if (imp.includes('-api-service') || imp.endsWith('/auth-service') && !imp.includes('.server')) {
        addViolation(layer, filePath, `Server layer imports Client Service "${imp}".`, 'Use server service instead.');
      }
    }
  }

  for (const imp of extractImports(content)) {
    const target = importTargetLayer(imp);
    const violation = getForbiddenImportViolation(layer, target, imp);
    if (violation) {
      addViolation(layer, filePath, violation, getAllowedHint(layer, target));
    }
  }

  if (layer === 'business-api') {
    const hasServerService = extractImports(content).some(
      (imp) => imp.includes('.server') || imp.includes('service.server') || imp.includes('-service.server')
    );
    const importsRepo = extractImports(content).some((imp) => imp.includes('/repositories/'));
    const importsOps = extractImports(content).some((imp) => imp.includes('/operations/'));
    if (!hasServerService && fileRel.includes('/auth/') && !fileRel.endsWith('logout/route.ts')) {
      if (importsRepo || importsOps) {
        addViolation('business-api', filePath, 'Business API must delegate to Server Services only.', 'Business API → Server Services.');
      }
    }
  }

  if (layer === 'server-services') {
    const importsDrizzle = /from\s+['"]drizzle-orm/.test(content);
    if (importsDrizzle) {
      addViolation('server-services', filePath, 'Server Service uses Drizzle directly.', 'Use Query / Command layer.');
    }
    const importsRepoDirect = /from\s+['"]@\/features\/[^'"]+\/repositories\/[^'"]+['"]/.test(content);
    if (importsRepoDirect && !content.includes('IUserRepository') && content.includes('userRepository')) {
      // AuthService uses IUserRepository interface with default userRepository - allowed via constructor DI
    }
  }

  checkImageStorageContract(fileRel, content, filePath);
  checkNativePlatformContract(fileRel, content, filePath);
}

export function checkExternalDataAccessOwnership(filePath: string): void {
  const content = readFileSync(filePath, 'utf8');
  const fileRel = rel(filePath);
  const strippedContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  if (/from\s+['"](?:better-sqlite3|@libsql\/|drizzle-orm)/.test(content)) {
    addViolation(
      'database-client',
      filePath,
      'Database driver imported outside the central Data Access module.',
      'Move the implementation to src/modules/data-access.',
    );
  }
  if (/\b(?:window\.)?indexedDB\s*\./.test(content)) {
    addViolation(
      'database-client',
      filePath,
      'IndexedDB accessed outside the central Data Access browser adapter.',
      'Use src/modules/data-access/browser.',
    );
  }
  if (RAW_SQL_PATTERNS.some((pattern) => pattern.test(strippedContent))) {
    addViolation(
      'repository',
      filePath,
      `Database statement detected outside Data Access (${fileRel}).`,
      'Move the query or command to src/modules/data-access.',
    );
  }
  if (DIRECT_DATABASE_CALL_PATTERNS.some((pattern) => pattern.test(strippedContent))) {
    addViolation(
      'database-client',
      filePath,
      'Direct database execution detected outside the central Data Access module.',
      'Call a typed data-access query or command.',
    );
  }
}

export function checkGeneratedDataAccessArtifacts(): void {
  if (!existsSync(PUSH_WORKER_SOURCE) || !existsSync(PUBLIC_PUSH_WORKER)) {
    addViolation(
      'database-client',
      PUSH_WORKER_SOURCE,
      'The IndexedDB push-worker source or its public artifact is missing.',
      'Run npm run data-access:sync-public.',
    );
    return;
  }
  if (readFileSync(PUSH_WORKER_SOURCE, 'utf8') !== readFileSync(PUBLIC_PUSH_WORKER, 'utf8')) {
    addViolation(
      'database-client',
      PUBLIC_PUSH_WORKER,
      'Generated push worker differs from its Data Access source.',
      'Edit the module source, then run npm run data-access:sync-public.',
    );
  }
}

export function checkCategoryModuleContract(fileRel: string, content: string, filePath: string): void {
  const insideCategoryModule = fileRel.startsWith('src/features/categories/');
  const catalogStudioTooling = fileRel.startsWith('src/features/catalog-studio/');
  const categoryInfrastructure = fileRel.startsWith('src/features/categories/infrastructure/');
  const pharmacyCatalogInfrastructure = fileRel.startsWith('src/features/pharmacy-profile-catalog/infrastructure/');
  const productionContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  if (!insideCategoryModule) {
    const internalImport = /from\s+['"]@\/features\/categories\/(domain|infrastructure|services|types)\//.test(content);
    if (internalImport) {
      addViolation('Category Module Contract', filePath, 'Category internals imported outside the module.', 'Import only from @/features/categories.');
    }
    if (/getAllForSpecialties/.test(productionContent)) {
      addViolation('Category Module Contract', filePath, 'Legacy raw category API is forbidden.', 'Use typed category module projections.');
    }
    if (
      !pharmacyCatalogInfrastructure &&
      !STRUCTURED_CATEGORY_COLUMN_FILES.has(fileRel) &&
      !fileRel.startsWith(
        'src/modules/data-access/domains/profile/repositories/profile-repository-parts/',
      ) &&
      /\b(title_ar|title_en|category_id|original_id|sub_collection|collection_ar|collection_en|collection_image)\b/.test(productionContent)
    ) {
      addViolation('Category Module Contract', filePath, 'Raw category JSON fields leaked outside the module.', 'Use camelCase public projections.');
    }
    if (!pharmacyCatalogInfrastructure && !catalogStudioTooling && /categories\.json|subcategories\.json/.test(productionContent)) {
      addViolation('Category Module Contract', filePath, 'Category JSON accessed outside the category module.', 'Use @/features/categories.');
    }
  }

  if (insideCategoryModule && !categoryInfrastructure && /\b(title_ar|title_en|category_id|original_id|sub_collection)\b/.test(productionContent)) {
    addViolation('Category Module Contract', filePath, 'Raw category fields used outside infrastructure.', 'Map raw DTOs before domain/service use.');
  }
  if (insideCategoryModule && /\bany\b/.test(productionContent)) {
    addViolation('Category Module Contract', filePath, 'any is forbidden in the category module.', 'Use explicit category types.');
  }
  if (insideCategoryModule && /DOCTOR_APPOINTMENT_GROUP_ID|\b-1000\b/.test(productionContent)) {
    addViolation('Category Module Contract', filePath, 'Numeric Doctor Appointment virtual IDs are forbidden.', 'Use virtual:doctor-appointment.');
  }
}
