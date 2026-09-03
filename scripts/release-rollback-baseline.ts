import {
  type ProjectDeploymentBaseline,
  captureReleaseRollbackBaseline as captureVercelReleaseRollbackBaseline,
  formatRollbackReport,
  rollbackReleaseBaseline as rollbackVercelReleaseBaseline,
  rollbackSucceeded,
  vercelAccessForReleaseAccount,
} from "@asol/vercel-deploy-core";

/**
 * The rollback baseline of a release transaction.
 *
 * Captured before the first production mutation so any failure afterwards can
 * re-promote the exact deployments that were live, instead of pausing for a
 * human decision. Names and IDs only — no secret value is ever read here beyond
 * the account token needed to talk to Vercel.
 */

export function vercelAccessForAccount(account: string): { token: string; teamId?: string } {
  return vercelAccessForReleaseAccount(account);
}

export async function captureReleaseRollbackBaseline(
  logPrefix: string,
): Promise<ProjectDeploymentBaseline[]> {
  const baselines = await captureVercelReleaseRollbackBaseline();
  console.log(`${logPrefix} Captured rollback baseline for ${baselines.length} runtime(s).`);
  return baselines;
}

export async function rollbackReleaseBaseline(
  baselines: readonly ProjectDeploymentBaseline[],
  logPrefix: string,
): Promise<boolean> {
  if (baselines.length === 0) {
    console.error(`${logPrefix} No rollback baseline was captured.`);
    return false;
  }
  console.error(`${logPrefix} Rolling back to the captured production baseline...`);
  const outcomes = await rollbackVercelReleaseBaseline(baselines);
  console.error(formatRollbackReport(outcomes));
  return rollbackSucceeded(outcomes);
}
