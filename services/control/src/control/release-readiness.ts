import 'server-only';

import { isRemoteDeployAllTerminal } from '@asol/vercel-deploy-core/remote-deploy-contracts';
import { getRemoteDeployAllResult } from '@asol/vercel-deploy-core/remote-deploy-sandbox';

export type ReleaseReadinessStatus = 'pending' | 'ready' | 'failed';

/**
 * Whether one exact commit has finished deploying.
 *
 * The barrier answers three words and nothing else. It is the one control
 * surface a release pipeline polls without a Super Admin session, so it must not
 * be able to leak what the deploy console shows: no logs, no stage, no sandbox
 * name, no error text, no configuration. A caller learns whether to proceed.
 *
 * A revision the runtime has no record of is `pending`, not `failed`: the
 * pipeline may be asking before the deploy started, and answering `failed` there
 * would abort a release that had not yet begun.
 */
export async function releaseReadinessFor(revision: string): Promise<ReleaseReadinessStatus> {
  const { snapshot } = await getRemoteDeployAllResult();
  if (snapshot.revision !== revision) return 'pending';
  if (!isRemoteDeployAllTerminal(snapshot.status)) return 'pending';
  return snapshot.status === 'succeeded' ? 'ready' : 'failed';
}
