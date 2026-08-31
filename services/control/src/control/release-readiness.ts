import 'server-only';

import { controlReleaseStateDataSource } from '@asol/data-core/control-release-state';
import {
  SqlReleaseStateStore,
  releaseReadinessStatusFromStore,
} from '@asol/vercel-deploy-core';

export type ReleaseReadinessStatus = 'pending' | 'ready' | 'failed';

const store = new SqlReleaseStateStore(controlReleaseStateDataSource);

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
  return releaseReadinessStatusFromStore(store, revision);
}
