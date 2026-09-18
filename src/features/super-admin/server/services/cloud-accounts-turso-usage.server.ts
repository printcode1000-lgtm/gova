import 'server-only';

import { readOptionalEnv } from '@/core/config/server-env';
import { registerDataCoreRuntimeConfigPorts } from '@/features/data/server';

import { listTursoOrganizationKeys } from './cloud-accounts-turso-organizations';
import { readTursoOrganizationRow, type TursoOrganizationRow } from './cloud-accounts-turso-usage';

registerDataCoreRuntimeConfigPorts();

export type LiveTursoUsageRow = TursoOrganizationRow;

/** Every Turso organization in the environment contract, read now. */
export async function readLiveCloudAccountsTursoUsage(): Promise<{
  readonly capturedAt: string;
  readonly accounts: readonly LiveTursoUsageRow[];
}> {
  const capturedAt = new Date().toISOString();
  const accounts = await Promise.all(
    listTursoOrganizationKeys().map((keys) =>
      readTursoOrganizationRow(keys, readOptionalEnv, capturedAt),
    ),
  );
  return { capturedAt, accounts };
}
