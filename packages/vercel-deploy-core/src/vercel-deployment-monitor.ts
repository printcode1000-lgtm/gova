export type VercelDeploymentState =
  | 'QUEUED'
  | 'INITIALIZING'
  | 'BUILDING'
  | 'READY'
  | 'ERROR'
  | 'CANCELED'
  | 'TIMEOUT'
  | 'NOT_FOUND';

export interface VercelDeploymentReport {
  target: string;
  project: string;
  account: string;
  comment: string;
  state: VercelDeploymentState;
  url?: string;
  deploymentId?: string;
  errorCode?: string;
  message: string;
  verifiedAt: string;
}

interface VercelDeploymentRecord {
  uid?: string;
  id?: string;
  url?: string;
  state?: string;
  readyState?: string;
  errorCode?: string;
  errorMessage?: string;
  aliasError?: { code?: string; message?: string } | null;
  meta?: Record<string, unknown>;
}

const TERMINAL_STATES = new Set(['READY', 'ERROR', 'CANCELED']);

function headers(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function withTeam(url: string, teamId?: string): string {
  if (!teamId) return url;
  return `${url}${url.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}`;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function normalizeState(record: VercelDeploymentRecord): VercelDeploymentState {
  const value = String(record.readyState ?? record.state ?? 'INITIALIZING').toUpperCase();
  return ['QUEUED', 'INITIALIZING', 'BUILDING', 'READY', 'ERROR', 'CANCELED'].includes(value)
    ? (value as VercelDeploymentState)
    : 'INITIALIZING';
}

export async function resolveVercelAccount(
  token: string,
): Promise<{ teamId?: string; account: string }> {
  const response = await fetch('https://api.vercel.com/v2/teams', {
    headers: headers(token),
    cache: 'no-store',
  });
  if (!response.ok) return { account: 'personal' };
  const data = (await response.json()) as {
    teams?: Array<{ id?: string; slug?: string }>;
  };
  const team = data.teams?.[0];
  return {
    teamId: team?.id,
    account: team?.slug || team?.id || 'personal',
  };
}

export function vercelDeploymentMetadata(input: {
  target: string;
  comment: string;
  runId: string;
  revision: string;
}): string[] {
  const metadata = [
    '--meta',
    `asolDeploymentTarget=${input.target}`,
    '--meta',
    `asolDeploymentRunId=${input.runId}`,
    '--meta',
    `asolDeploymentRevision=${input.revision}`,
    '--meta',
    `asolDeploymentComment=${input.comment}`,
  ];

  // Only the GitHub-linked main app may emit GitHub-shaped deployment metadata.
  if (input.target === 'main') {
    metadata.push(
      '--meta',
      `githubCommitMessage=${input.comment}`,
      '--meta',
      `githubCommitSha=${input.revision}`,
    );
  }

  return metadata;
}

export async function waitForVercelProductionDeployment(input: {
  token: string;
  project: string;
  target: string;
  account: string;
  comment: string;
  teamId?: string;
  runId?: string;
  revision?: string;
  timeoutMs?: number;
}): Promise<VercelDeploymentReport> {
  const timeoutMs = input.timeoutMs ?? 12 * 60_000;
  const startedAt = Date.now();
  let found: VercelDeploymentRecord | undefined;

  while (Date.now() - startedAt < timeoutMs) {
    const listUrl = withTeam(
      `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(input.project)}&target=production&limit=20`,
      input.teamId,
    );
    const response = await fetch(listUrl, {
      headers: headers(input.token),
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Vercel deployment lookup failed (${response.status}).`);
    }
    const data = (await response.json()) as { deployments?: VercelDeploymentRecord[] };
    found = data.deployments?.find((deployment) => {
      if (input.runId) return deployment.meta?.asolDeploymentRunId === input.runId;
      if (input.revision) {
        return (
          deployment.meta?.asolDeploymentRevision === input.revision ||
          deployment.meta?.githubCommitSha === input.revision
        );
      }
      return false;
    });

    if (found) {
      const id = found.uid ?? found.id;
      if (id) {
        const detailResponse = await fetch(
          withTeam(`https://api.vercel.com/v13/deployments/${encodeURIComponent(id)}`, input.teamId),
          { headers: headers(input.token), cache: 'no-store' },
        );
        if (detailResponse.ok) found = (await detailResponse.json()) as VercelDeploymentRecord;
      }
      const state = normalizeState(found);
      if (TERMINAL_STATES.has(state)) {
        const aliasFailure = found.aliasError?.message || found.aliasError?.code;
        const finalState = state === 'READY' && aliasFailure ? 'ERROR' : state;
        return {
          target: input.target,
          project: input.project,
          account: input.account,
          comment: input.comment,
          state: finalState,
          url: found.url ? `https://${found.url}` : undefined,
          deploymentId: found.uid ?? found.id,
          errorCode: found.errorCode ?? found.aliasError?.code,
          message:
            aliasFailure ||
            found.errorMessage ||
            (finalState === 'READY'
              ? 'Vercel accepted the deployment and production is ready.'
              : `Vercel finished with ${finalState}.`),
          verifiedAt: new Date().toISOString(),
        };
      }
    }
    await wait(2_500);
  }

  return {
    target: input.target,
    project: input.project,
    account: input.account,
    comment: input.comment,
    state: found ? 'TIMEOUT' : 'NOT_FOUND',
    url: found?.url ? `https://${found.url}` : undefined,
    deploymentId: found?.uid ?? found?.id,
    message: found
      ? 'Vercel did not reach a terminal state before the verification deadline.'
      : 'No production deployment matching this run was found on Vercel.',
    verifiedAt: new Date().toISOString(),
  };
}

export function printDeploymentReport(report: VercelDeploymentReport): void {
  console.log(`[ASOL_DEPLOY_REPORT] ${JSON.stringify(report)}`);
}

export async function redeployLatestProduction(input: {
  token: string;
  projectName: string;
  projectId?: string;
  teamId?: string;
}): Promise<{ url?: string; deploymentId?: string }> {
  let projectId = input.projectId?.trim() ?? "";
  if (!projectId) {
    const projectResponse = await fetch(
      withTeam(
        `https://api.vercel.com/v9/projects/${encodeURIComponent(input.projectName)}`,
        input.teamId,
      ),
      { headers: headers(input.token), cache: 'no-store' },
    );
    if (!projectResponse.ok) {
      throw new Error(`Vercel project "${input.projectName}" not found (${projectResponse.status}).`);
    }
    const project = (await projectResponse.json()) as { id: string };
    projectId = project.id;
  }

  const listUrl = withTeam(
    `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=1&target=production`,
    input.teamId,
  );
  const listResponse = await fetch(listUrl, {
    headers: headers(input.token),
    cache: 'no-store',
  });
  if (!listResponse.ok) {
    throw new Error(`Vercel deployment lookup failed (${listResponse.status}).`);
  }
  const list = (await listResponse.json()) as { deployments?: VercelDeploymentRecord[] };
  const latest = list.deployments?.[0];
  const deploymentId = latest?.uid ?? latest?.id;
  if (!deploymentId) {
    throw new Error('No production deployment found to redeploy.');
  }

  const redeployResponse = await fetch(withTeam('https://api.vercel.com/v13/deployments', input.teamId), {
    method: 'POST',
    headers: headers(input.token),
    body: JSON.stringify({
      name: input.projectName,
      deploymentId,
      target: 'production',
    }),
  });
  const body = await redeployResponse.text();
  if (!redeployResponse.ok) {
    throw new Error(`Vercel redeploy failed (${redeployResponse.status}): ${body}`);
  }
  const created = JSON.parse(body) as { url?: string; id?: string };
  return {
    url: created.url ? `https://${created.url}` : undefined,
    deploymentId: created.id,
  };
}
