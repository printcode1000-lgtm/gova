import {
  cleanupVercelProjectDeployments,
  vercelAccessForReleaseAccount,
} from "@asol/vercel-deploy-core";
import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";

export interface CleanupGovaDeploymentHistoryInput {
  currentDeploymentId?: string;
  rollbackDeploymentId?: string;
  logPrefix: string;
}

/**
 * Best-effort post-release hygiene. It must never turn a READY release into a rollback.
 * The current production deployment and the baseline captured before the release are
 * the only historical deployments protected by Gova's application-level retention rule.
 */
export async function cleanupGovaDeploymentHistory(
  input: CleanupGovaDeploymentHistoryInput,
): Promise<void> {
  if (!input.currentDeploymentId) {
    console.warn(
      `${input.logPrefix} Gova deployment cleanup skipped: current deployment id is unavailable.`,
    );
    return;
  }

  try {
    const access = vercelAccessForReleaseAccount("gova");
    const protectedDeploymentIds = [input.currentDeploymentId];
    if (
      input.rollbackDeploymentId &&
      input.rollbackDeploymentId !== input.currentDeploymentId
    ) {
      protectedDeploymentIds.push(input.rollbackDeploymentId);
    }

    const result = await cleanupVercelProjectDeployments({
      token: access.token,
      teamId: access.teamId,
      project: ACCOUNT_DECLARATIONS.gova.project,
      protectedDeploymentIds,
    });

    const suffix = result.rateLimited
      ? `; Vercel delete quota reached${result.rateLimitResetAt ? ` until ${result.rateLimitResetAt}` : ""}`
      : "";
    console.log(
      `${input.logPrefix} Gova deployment history cleanup: scanned=${result.scanned}, ` +
        `protected=${result.protected}, eligible=${result.eligible}, deleted=${result.deleted}, ` +
        `active=${result.skippedActive}, failed=${result.failed}${suffix}.`,
    );
  } catch (error) {
    console.warn(
      `${input.logPrefix} Gova deployment history cleanup deferred: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
