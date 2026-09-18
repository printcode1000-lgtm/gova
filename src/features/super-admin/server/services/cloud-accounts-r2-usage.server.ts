import 'server-only';

import { readCloudflareR2UsageAnalytics } from '@asol/storage-core/server';

import {
  r2LiveAccountDescriptors,
  safeCloudflareErrorMessage,
} from './cloud-accounts-r2-live-accounts.server';

const FREE_LIMITS = {
  classAOperations: 1_000_000,
  classBOperations: 10_000_000,
  storageBytes: 10_000_000_000,
} as const;

export type LiveR2UsageRow = {
  readonly id: string;
  readonly status: 'ok' | 'missingCredentials' | 'apiError';
  readonly capturedAt: string | null;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly classAOperations: number | null;
  readonly classAOperationsLimit: number;
  readonly classBOperations: number | null;
  readonly classBOperationsLimit: number;
  readonly storageBytes: number | null;
  readonly storageBytesLimit: number;
  readonly objectCount: number | null;
  readonly uploadCount: number | null;
  readonly operationTypes: readonly string[];
  readonly message: string | null;
};

function unavailable(
  id: string,
  status: 'missingCredentials' | 'apiError',
  message: string,
): LiveR2UsageRow {
  return {
    id,
    status,
    capturedAt: null,
    periodStart: null,
    periodEnd: null,
    classAOperations: null,
    classAOperationsLimit: FREE_LIMITS.classAOperations,
    classBOperations: null,
    classBOperationsLimit: FREE_LIMITS.classBOperations,
    storageBytes: null,
    storageBytesLimit: FREE_LIMITS.storageBytes,
    objectCount: null,
    uploadCount: null,
    operationTypes: [],
    message,
  };
}

export async function readLiveCloudAccountsR2Usage(): Promise<{
  readonly capturedAt: string;
  readonly accounts: readonly LiveR2UsageRow[];
}> {
  const capturedAt = new Date();
  const accounts = await Promise.all(
    r2LiveAccountDescriptors().map(async (account): Promise<LiveR2UsageRow> => {
      const { apiToken } = account;
      if (!apiToken) {
        return unavailable(account.id, 'missingCredentials', 'cloudflareApiTokenMissing');
      }

      try {
        const usage = await readCloudflareR2UsageAnalytics({
          accountId: account.accountId,
          bucketName: account.bucketName,
          apiToken,
          now: capturedAt,
        });
        return {
          id: account.id,
          status: 'ok',
          ...usage,
          classAOperationsLimit: FREE_LIMITS.classAOperations,
          classBOperationsLimit: FREE_LIMITS.classBOperations,
          storageBytesLimit: FREE_LIMITS.storageBytes,
          message: null,
        };
      } catch (error) {
        return unavailable(
          account.id,
          'apiError',
          safeCloudflareErrorMessage(error, 'cloudflareR2AnalyticsFailed'),
        );
      }
    }),
  );

  return { capturedAt: capturedAt.toISOString(), accounts };
}
