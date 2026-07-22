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
  'src/core/storage/providers/cloudflare-r2.provider.server.ts',
]);

/** R2 client module — forbidden patterns allowed here only. */
export const R2_S3_CLIENT_MODULE = 'src/core/provisioning/r2-s3-client.ts';

/** Only module allowed to import image-storage-api-service. */
export const IMAGE_STORAGE_API_ADAPTER_ALLOWED_IMPORTERS = new Set([
  'src/features/storage/services/image-storage-service.ts',
  'src/features/storage/services/image-storage-api-service.ts',
]);

/** Files exempt from forbidden-pattern scan (definitions / providers). */
export const IMAGE_STORAGE_FORBIDDEN_PATTERN_EXEMPT = new Set([
  R2_S3_CLIENT_MODULE,
  'src/core/storage/providers/cloudflare-r2.provider.server.ts',
  'src/core/storage/providers/local-storage.provider.server.ts',
  'src/core/storage/storage/image-key-generator.ts',
  'src/core/architecture/image-storage-contract.ts',
]);

/** Legacy blob upload — must migrate to StorageImageManager. */
export const IMAGE_STORAGE_LEGACY_BLOB_UPLOAD_FILES = new Set([
  'src/components/onboarding/form-components.tsx',
  'src/components/onboarding/sections/verification-section.tsx',
]);

/** Forbidden direct API adapter imports outside client service + hook orchestration. */
export const IMAGE_STORAGE_API_ADAPTER = 'image-storage-api-service';

/** Patterns indicating architecture violations in source files. */
export const IMAGE_STORAGE_FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /uploadR2Object\s*\(/, message: 'Direct R2 upload outside Provider Layer' },
  { pattern: /deleteR2Object\s*\(/, message: 'Direct R2 delete outside Provider Layer' },
  { pattern: /new\s+CloudflareR2Provider\s*\(/, message: 'Direct Provider instantiation forbidden' },
  { pattern: /new\s+LocalStorageProvider\s*\(/, message: 'Direct Provider instantiation forbidden' },
  { pattern: /randomUUID\s*\(\).*\.webp/, message: 'ImageKey must use ImageKeyGenerator only' },
];
