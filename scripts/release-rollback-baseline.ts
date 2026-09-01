import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";
import {
  type ProjectDeploymentBaseline,
  RELEASE_WORKLOADS,
  captureProductionBaseline,
  formatRollbackReport,
  rollbackSucceeded,
  rollbackToBaseline,
} from "@asol/vercel-deploy-core";

/**
 * The rollback baseline of a release transaction.
 *
 * Captured before the first production mutation so any failure afterwards can
 * re-promote the exact deployments that were live, instead of pausing for a
 * human decision. Names and IDs only — no secret value is ever read here beyond
 * the account token needed to talk to Vercel.
 */

const ROLLBACK_ACCOUNTS = ["gova", "control", ...RELEASE_WORKLOADS] as const;

function declarationForAccount(account: string) {
  const declaration = ACCOUNT_DECLARATIONS[account];
  if (!declaration) throw new Error(`Unknown deployment account "${account}".`);
  return declaration;
}

export function vercelAccessForAccount(account: string): { token: string; teamId?: string } {
  const declaration = declarationForAccount(account);
  const token = process.env[declaration.tokenEnvVar]?.trim();
  if (!token) throw new Error(`${declaration.tokenEnvVar} is required for ${account}.`);
  const teamId = declaration.teamIdEnvVar
    ? process.env[declaration.teamIdEnvVar]?.trim()
    : undefined;
  return { token, teamId: teamId || undefined };
}

export async function captureReleaseRollbackBaseline(
  logPrefix: string,
): Promise<ProjectDeploymentBaseline[]> {
  const baselines: ProjectDeploymentBaseline[] = [];
  for (const account of ROLLBACK_ACCOUNTS) {
    const declaration = declarationForAccount(account);
    baselines.push(
      await captureProductionBaseline({
        account,
        project: declaration.project,
        ...vercelAccessForAccount(account),
      }),
    );
  }
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
  const outcomes = await rollbackToBaseline(baselines, vercelAccessForAccount);
  console.error(formatRollbackReport(outcomes));
  return rollbackSucceeded(outcomes);
}
