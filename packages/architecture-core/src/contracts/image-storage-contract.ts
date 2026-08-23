/**
 * Image Storage Architecture Contract — enforced by scripts/architecture-check.ts
 */

/** Only authorized client upload entry point module. */
export const IMAGE_STORAGE_CLIENT_ENTRY = 'src/features/storage/services/image-storage-service.ts';

/** Only authorized server upload API route. */
export const IMAGE_STORAGE_SERVER_UPLOAD_ROUTE = 'src/app/api/storage/images/upload/route.ts';

/** Only authorized server application layer for uploads. */
export const IMAGE_STORAGE_APPLICATION_LAYER =
  'src/features/storage/application/image-upload-application.service.server.ts';

/** Modules allowed to import R2 S3 operations (Provider Layer only). */
export const R2_S3_CLIENT_ALLOWED_IMPORTERS = new Set([
  'packages/storage-core/src/adapters/s3-client.adapter.ts',
  'packages/storage-core/src/server/transport/r2-object-store.ts',
  'packages/ota-core/src/publishing/adapters/r2-storage.adapter.ts',
  'packages/backup-core/src/server/r2-backup.repository.ts',
  'packages/data-core/src/tooling/migrate-r2-image-public-url.ts',
  'packages/data-core/src/tooling/migrate-r2-cloud-folders.ts',
]);

/** R2 client module — adapter in storage-core. */
export const R2_S3_CLIENT_MODULE = 'packages/storage-core/src/adapters/s3-client.adapter.ts';

/** Only module allowed to import image-storage-api-service. */
export const IMAGE_STORAGE_API_ADAPTER_ALLOWED_IMPORTERS = new Set([
  'src/features/storage/services/image-storage-service.ts',
  'src/features/storage/services/image-storage-api-service.ts',
]);

/** Files exempt from forbidden-pattern scan (definitions / providers). */
export const IMAGE_STORAGE_FORBIDDEN_PATTERN_EXEMPT = new Set([
  R2_S3_CLIENT_MODULE,
  'packages/storage-core/src/server/providers/r2-account.provider.ts',
  'packages/storage-core/src/server/providers/local-storage.provider.ts',
  'packages/storage-core/src/server/transport/r2-object-store.ts',
  'packages/storage-core/src/domain/images/image-key-generator.ts',
  'packages/ota-core/src/publishing/adapters/r2-storage.adapter.ts',
  'packages/backup-core/src/server/r2-backup.repository.ts',
  'packages/data-core/src/tooling/migrate-r2-image-public-url.ts',
  'packages/data-core/src/tooling/migrate-r2-cloud-folders.ts',
  'packages/architecture-core/src/contracts/image-storage-contract.ts',
]);

/** Legacy blob upload — must migrate to StorageImageManager. */
export const IMAGE_STORAGE_LEGACY_BLOB_UPLOAD_FILES = new Set([
  'src/features/onboarding/presentation/form-components.tsx',
  'src/features/onboarding/presentation/sections/verification-section.tsx',
]);

/** Forbidden direct API adapter imports outside client service + hook orchestration. */
export const IMAGE_STORAGE_API_ADAPTER = 'image-storage-api-service';

/** Patterns indicating architecture violations in source files. */
export const IMAGE_STORAGE_FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /uploadR2Object\s*\(/, message: 'Direct R2 upload outside Provider Layer' },
  { pattern: /deleteR2Object\s*\(/, message: 'Direct R2 delete outside Provider Layer' },
  { pattern: /new\s+R2AccountProvider\s*\(/, message: 'Direct Provider instantiation forbidden' },
  { pattern: /new\s+LocalStorageProvider\s*\(/, message: 'Direct Provider instantiation forbidden' },
  { pattern: /randomUUID\s*\(\).*\.webp/, message: 'ImageKey must use ImageKeyGenerator only' },
];
