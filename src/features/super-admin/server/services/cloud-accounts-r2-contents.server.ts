import 'server-only';

import { readCloudflareR2BucketContents } from '@asol/storage-core/server';

import {
  r2LiveAccountDescriptors,
  safeCloudflareErrorMessage,
} from './cloud-accounts-r2-live-accounts.server';

export type LiveR2ContentsRow = {
  readonly id: string;
  readonly status: 'ok' | 'missingCredentials' | 'apiError';
  readonly capturedAt: string | null;
  readonly objectCount: number | null;
  readonly totalSizeBytes: number | null;
  readonly latestObjectKey: string | null;
  readonly latestObjectLastModified: string | null;
  readonly message: string | null;
};

function unavailable(
  id: string,
  status: 'missingCredentials' | 'apiError',
  message: string,
): LiveR2ContentsRow {
  return {
    id,
    status,
    capturedAt: null,
    objectCount: null,
    totalSizeBytes: null,
    latestObjectKey: null,
    latestObjectLastModified: null,
    message,
  };
}

/** What every R2 bucket holds now; a failing account keeps its snapshot on the page. */
export async function readLiveCloudAccountsR2Contents(): Promise<{
  readonly capturedAt: string;
  readonly accounts: readonly LiveR2ContentsRow[];
}> {
  const capturedAt = new Date();
  const accounts = await Promise.all(
    r2LiveAccountDescriptors().map(async (account): Promise<LiveR2ContentsRow> => {
      if (!account.apiToken) {
        return unavailable(account.id, 'missingCredentials', 'cloudflareApiTokenMissing');
      }
      try {
        const contents = await readCloudflareR2BucketContents({
          accountId: account.accountId,
          bucketName: account.bucketName,
          apiToken: account.apiToken,
          now: capturedAt,
        });
        return { id: account.id, status: 'ok', ...contents, message: null };
      } catch (error) {
        return unavailable(
          account.id,
          'apiError',
          safeCloudflareErrorMessage(error, 'cloudflareR2ObjectsFailed'),
        );
      }
    }),
  );
  return { capturedAt: capturedAt.toISOString(), accounts };
}
