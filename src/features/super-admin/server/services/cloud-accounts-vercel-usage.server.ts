import 'server-only';

import { ACCOUNT_DECLARATIONS, type AccountDeclaration } from '@asol/account-declarations';
import { readOptionalEnv } from '@/core/config/server-env';

import type { VercelCloudAccountUsage } from '../../presentation/cloud-accounts-facts.types';
import { readVercelAccountUsage } from './cloud-accounts-vercel-usage';

export type LiveVercelUsageRow = VercelCloudAccountUsage & { readonly id: string };

function credentialValues(declaration: AccountDeclaration): Record<string, string | undefined> {
  const keys = [declaration.tokenEnvVar, declaration.teamIdEnvVar].filter(
    (key): key is string => Boolean(key),
  );
  return Object.fromEntries(keys.map((key) => [key, readOptionalEnv(key)]));
}

/**
 * Every declared Vercel account's usage, read now. The summary is the same one
 * the snapshot script writes; tokens stay on the server.
 */
export async function readLiveCloudAccountsVercelUsage(): Promise<{
  readonly capturedAt: string;
  readonly accounts: readonly LiveVercelUsageRow[];
}> {
  const capturedAt = new Date().toISOString();
  const accounts = await Promise.all(
    (Object.values(ACCOUNT_DECLARATIONS) as AccountDeclaration[]).map(async (declaration) => ({
      id: declaration.name,
      ...((await readVercelAccountUsage(
        declaration,
        credentialValues(declaration),
        capturedAt,
      )) as VercelCloudAccountUsage),
    })),
  );
  return { capturedAt, accounts };
}
