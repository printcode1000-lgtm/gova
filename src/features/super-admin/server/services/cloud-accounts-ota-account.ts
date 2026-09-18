import { OTA_R2_STORAGE_TARGET } from "@asol/ota-core/publishing";

/**
 * The OTA bucket as a cloud-accounts column. OTA is routed through
 * `@asol/ota-core`, not the storage account registry, so every field comes from
 * `OTA_R2_STORAGE_TARGET`; `id` is the key the R2 snapshots and live reads use.
 */
export const OTA_R2_CLOUD_ACCOUNT = {
  id: "ota",
  accountId: OTA_R2_STORAGE_TARGET.accountId,
  email: OTA_R2_STORAGE_TARGET.email,
  bucketName: OTA_R2_STORAGE_TARGET.bucketName,
  publicUrl: OTA_R2_STORAGE_TARGET.publicUrl,
  envPrefix: OTA_R2_STORAGE_TARGET.envPrefix,
} as const;
