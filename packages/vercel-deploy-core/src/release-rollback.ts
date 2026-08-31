/**
 * Rollback for a release that has already started mutating production.
 *
 * The contract this implements is that once the first production mutation
 * happens, a failure must not pause for instructions. A half-applied topology —
 * three workloads on the new revision, three on the old, and a frontend
 * redirecting to both — is worse than either end state, and nobody is watching
 * at the moment it happens.
 *
 * So the baseline is captured *before* the first mutation and the compensation
 * is mechanical: re-promote each project to the exact deployment it was serving.
 * Vercel's promote endpoint makes an existing deployment production again
 * without rebuilding, which is what makes this safe to run from a failure path:
 * a rebuild could fail for the same reason the release did.
 *
 * Names and IDs only. No secret value is read, stored, or reported.
 */
export interface ProjectDeploymentBaseline {
  /** Account name from the declaration, e.g. `control`. */
  account: string;
  project: string;
  /** Absent when the project does not exist yet — control, on the first release. */
  deploymentId?: string;
  url?: string;
  capturedAt: string;
}

export interface RollbackOutcome {
  account: string;
  project: string;
  /**
   * `restored` — promoted back. `skipped` — nothing to restore, because the
   * project had no production deployment when the baseline was taken, which is
   * the normal case for a project this release created. `failed` — the promote
   * itself failed, and the topology is now known-inconsistent.
   */
  result: 'restored' | 'skipped' | 'failed';
  deploymentId?: string;
  error?: string;
}

export interface VercelProjectAccess {
  token: string;
  teamId?: string;
}

type Fetch = typeof fetch;

function headers(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function withTeam(url: string, teamId?: string): string {
  if (!teamId) return url;
  return `${url}${url.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}`;
}

/**
 * The deployment a project is serving in production right now.
 *
 * A project that does not exist, or has never deployed, returns a baseline with
 * no `deploymentId` rather than throwing: "there was nothing here before" is a
 * real and expected answer during the release that creates it, and it is the
 * baseline the rollback needs in order to leave it alone.
 */
export async function captureProductionBaseline(
  input: { account: string; project: string } & VercelProjectAccess,
  fetchImpl: Fetch = fetch,
): Promise<ProjectDeploymentBaseline> {
  const capturedAt = new Date().toISOString();
  const url = withTeam(
    `https://api.vercel.com/v6/deployments?app=${encodeURIComponent(input.project)}&limit=1&target=production&state=READY`,
    input.teamId,
  );
  const response = await fetchImpl(url, { headers: headers(input.token), cache: 'no-store' });
  if (!response.ok) {
    return { account: input.account, project: input.project, capturedAt };
  }
  const body = (await response.json()) as {
    deployments?: Array<{ uid?: string; id?: string; url?: string }>;
  };
  const latest = body.deployments?.[0];
  const deploymentId = latest?.uid ?? latest?.id;
  return {
    account: input.account,
    project: input.project,
    deploymentId,
    url: latest?.url ? `https://${latest.url}` : undefined,
    capturedAt,
  };
}

/** Promotes an existing deployment back to production without rebuilding it. */
export async function promoteDeployment(
  input: { project: string; deploymentId: string } & VercelProjectAccess,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  const projectResponse = await fetchImpl(
    withTeam(`https://api.vercel.com/v9/projects/${encodeURIComponent(input.project)}`, input.teamId),
    { headers: headers(input.token), cache: 'no-store' },
  );
  if (!projectResponse.ok) {
    throw new Error(`Vercel project "${input.project}" not found (${projectResponse.status}).`);
  }
  const project = (await projectResponse.json()) as { id: string };

  const promoteResponse = await fetchImpl(
    withTeam(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(project.id)}/promote/${encodeURIComponent(input.deploymentId)}`,
      input.teamId,
    ),
    { method: 'POST', headers: headers(input.token) },
  );
  if (!promoteResponse.ok) {
    throw new Error(`Vercel promote failed for "${input.project}" (${promoteResponse.status}).`);
  }
}

/**
 * Restores every captured project, and never stops at the first failure.
 *
 * A rollback that aborts halfway leaves exactly the mixed topology it exists to
 * prevent, so each project is attempted regardless of the ones before it and the
 * caller is handed the full picture.
 */
export async function rollbackToBaseline(
  baselines: readonly ProjectDeploymentBaseline[],
  access: (account: string) => VercelProjectAccess,
  fetchImpl: Fetch = fetch,
): Promise<RollbackOutcome[]> {
  const outcomes: RollbackOutcome[] = [];
  for (const baseline of baselines) {
    if (!baseline.deploymentId) {
      outcomes.push({ account: baseline.account, project: baseline.project, result: 'skipped' });
      continue;
    }
    try {
      await promoteDeployment(
        { project: baseline.project, deploymentId: baseline.deploymentId, ...access(baseline.account) },
        fetchImpl,
      );
      outcomes.push({
        account: baseline.account,
        project: baseline.project,
        result: 'restored',
        deploymentId: baseline.deploymentId,
      });
    } catch (error) {
      outcomes.push({
        account: baseline.account,
        project: baseline.project,
        result: 'failed',
        deploymentId: baseline.deploymentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return outcomes;
}

/** True when every project either came back or had nothing to come back to. */
export function rollbackSucceeded(outcomes: readonly RollbackOutcome[]): boolean {
  return outcomes.every((outcome) => outcome.result !== 'failed');
}

/** Names-only summary, safe to print from a release log. */
export function formatRollbackReport(outcomes: readonly RollbackOutcome[]): string {
  if (outcomes.length === 0) return 'No production baseline was captured; nothing to restore.';
  return outcomes
    .map((outcome) => {
      const detail = outcome.result === 'failed' ? ` — ${outcome.error ?? 'unknown error'}` : '';
      return `${outcome.account} (${outcome.project}): ${outcome.result}${detail}`;
    })
    .join('\n');
}
