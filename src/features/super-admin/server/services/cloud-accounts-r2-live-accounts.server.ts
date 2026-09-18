import 'server-only';

import { getAllStorageAccounts } from '@asol/storage-core';
import { readOptionalEnv } from '@/core/config/server-env';

import { OTA_R2_CLOUD_ACCOUNT } from './cloud-accounts-ota-account';

/** One R2 bucket the live `/dev/cloud-accounts` reads resolve credentials for. */
export type R2LiveAccountDescriptor = {
  readonly id: string;
  readonly accountId: string;
  readonly bucketName: string;
  readonly apiToken: string;
};

function envOr(key: string, fallback: string): string {
  return readOptionalEnv(key)?.trim() || fallback;
}

/**
 * Storage-registry accounts plus the OTA bucket, each with its locally configured
 * account id (falling back to the declared one) and API token. Shared by the live
 * usage and live contents reads so both cover exactly the same buckets.
 */
export function r2LiveAccountDescriptors(): readonly R2LiveAccountDescriptor[] {
  const accounts = [
    ...getAllStorageAccounts().map((account) => ({
      id: account.id,
      accountId: account.accountId,
      bucketName: account.bucketName,
      envPrefix: account.envPrefix,
    })),
    {
      id: OTA_R2_CLOUD_ACCOUNT.id,
      accountId: OTA_R2_CLOUD_ACCOUNT.accountId,
      bucketName: OTA_R2_CLOUD_ACCOUNT.bucketName,
      envPrefix: OTA_R2_CLOUD_ACCOUNT.envPrefix,
    },
  ];
  return accounts.map((account) => ({
    id: account.id,
    accountId: envOr(account.envPrefix + '_ACCOUNT_ID', account.accountId),
    bucketName: envOr(account.envPrefix + '_BUCKET_NAME', account.bucketName),
    apiToken: readOptionalEnv(account.envPrefix + '_API_TOKEN')?.trim() ?? '',
  }));
}

export function safeCloudflareErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  return error.message.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
}
