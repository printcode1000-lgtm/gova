import { execFileSync } from 'child_process';
import { readFileSync } from 'node:fs';
import path from 'path';
import type { AccountDeclaration } from '@asol/account-declarations';
import {
  printDeploymentReport,
  vercelDeploymentMetadata,
  waitForVercelProductionDeployment,
} from './vercel-deployment-monitor';

// Re-exported so deploy and sync scripts keep one import. The declarations themselves
// live in their own package: see @asol/account-declarations for why that matters.
export * from '@asol/account-declarations';
export * from './vercel-deployment-monitor';
export * from './release-state';
export * from './release-rollback';

export interface VercelHeaders {
  Authorization: string;
  'Content-Type': string;
  [key: string]: string;
}

export function buildHeaders(token: string): VercelHeaders {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function resolveTeamId(token: string): Promise<string | undefined> {
  const response = await fetch('https://api.vercel.com/v2/teams', { headers: buildHeaders(token) });
  if (!response.ok) return undefined;
  const data = (await response.json()) as { teams?: Array<{ id: string; slug: string }> };
  const team = data.teams?.[0];
  if (team) console.log(`Vercel scope: team ${team.slug} (${team.id})`);
  return team?.id;
}

export interface VercelAccountAccessReport {
  name: AccountDeclaration['name'];
  project: string;
  tokenEnvVar: string;
  account: string;
  teamId?: string;
}

async function resolveTokenAccountName(token: string, tokenEnvVar: string): Promise<string> {
  const response = await fetch('https://api.vercel.com/v2/user', {
    headers: buildHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`${tokenEnvVar} was rejected by Vercel (${response.status}).`);
  }
  const data = (await response.json()) as {
    user?: { username?: string; email?: string; uid?: string; id?: string };
  };
  return data.user?.email ?? data.user?.username ?? data.user?.uid ?? data.user?.id ?? 'personal';
}

export async function verifyAccountTokenAccess(
  declaration: AccountDeclaration,
  env: Record<string, string | undefined> = process.env,
): Promise<VercelAccountAccessReport> {
  const token = env[declaration.tokenEnvVar]?.trim();
  if (!token) {
    throw new Error(`${declaration.tokenEnvVar} is missing from environment.`);
  }
  const account = await resolveTokenAccountName(token, declaration.tokenEnvVar);
  const teamId = await resolveAccountTeamId(declaration, env, token);
  return {
    name: declaration.name,
    project: declaration.project,
    tokenEnvVar: declaration.tokenEnvVar,
    account,
    teamId,
  };
}

function resolveAccountTeamId(
  declaration: AccountDeclaration,
  env: Record<string, string | undefined>,
  token: string,
): Promise<string | undefined> {
  return resolveTeamId(token).then(
    (teamId) => teamId ?? (declaration.teamIdEnvVar ? env[declaration.teamIdEnvVar]?.trim() : undefined),
  );
}

export function withTeam(url: string, teamId?: string): string {
  if (!teamId) return url;
  return `${url}${url.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}`;
}

export async function ensureProject(token: string, projectName: string, teamId?: string): Promise<string> {
  const found = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}`, teamId),
    { headers: buildHeaders(token) },
  );
  if (found.ok) {
    const data = (await found.json()) as { id: string };
    await disconnectProjectGitLink(token, data.id, teamId);
    await disableProjectGitIntegrations(token, data.id, teamId);
    console.log(`Project exists: ${projectName} (${data.id})`);
    return data.id;
  }

  // No git repository field: the project stays disconnected from GitHub on
  // purpose, so only this command can change what is deployed.
  const created = await fetch(withTeam('https://api.vercel.com/v10/projects', teamId), {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({ name: projectName, framework: 'nextjs' }),
  });
  if (!created.ok) {
    throw new Error(`Failed to create project: ${created.status} ${await created.text()}`);
  }
  const data = (await created.json()) as { id: string };
  console.log(`Project created: ${projectName} (${data.id})`);
  await disableProjectGitIntegrations(token, data.id, teamId);
  return data.id;
}

/**
 * Finds an existing project by name. **Never creates one.**
 *
 * Deliberately separate from `ensureProject`: the four service accounts are meant to be
 * created on first deploy, but a script that only pushes environment variables must not
 * conjure a project because a name was mistyped. An orphaned Vercel project created by a
 * typo is quiet, billable, and easy to miss.
 */
export async function findProject(
  token: string,
  projectName: string,
  teamId?: string,
): Promise<string | null> {
  const response = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}`, teamId),
    { headers: buildHeaders(token) },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as { id: string };
  return data.id;
}

export interface VercelProjectSummary {
  id: string;
  name: string;
  link?: { type?: string; repo?: string; repoId?: number };
}

export async function getProject(
  token: string,
  projectName: string,
  teamId?: string,
): Promise<VercelProjectSummary | null> {
  const response = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}`, teamId),
    { headers: buildHeaders(token) },
  );
  if (!response.ok) return null;
  return (await response.json()) as VercelProjectSummary;
}

export function assertProjectNotGitLinked(
  project: VercelProjectSummary | null,
  projectName: string,
): void {
  if (!project?.link?.type) return;
  throw new Error(
    `Project ${projectName} is Git-linked (${project.link.type}${project.link.repo ? `: ${project.link.repo}` : ''}). Only gova may use GitHub.`,
  );
}

export async function deleteProject(
  token: string,
  projectName: string,
  teamId?: string,
): Promise<boolean> {
  const project = await getProject(token, projectName, teamId);
  if (!project) {
    console.log(`Project not found: ${projectName}`);
    return false;
  }

  await disconnectProjectGitLink(token, project.id, teamId);
  await disableProjectGitIntegrations(token, project.id, teamId);

  const response = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${encodeURIComponent(project.id)}`, teamId),
    { method: 'DELETE', headers: buildHeaders(token) },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to delete project ${projectName}: ${response.status} ${await response.text()}`,
    );
  }
  console.log(`Project deleted: ${projectName} (${project.id})`);
  return true;
}

export async function disconnectProjectGitLink(
  token: string,
  projectId: string,
  teamId?: string,
): Promise<void> {
  const response = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/link`, teamId),
    { method: 'DELETE', headers: buildHeaders(token) },
  );
  if (response.status === 404) return;
  if (!response.ok) {
    throw new Error(
      `Failed to disconnect Git link for project ${projectId}: ${response.status} ${await response.text()}`,
    );
  }
  console.log(`Git link removed from project ${projectId}.`);
}

export async function disableProjectGitIntegrations(
  token: string,
  projectId: string,
  teamId?: string,
): Promise<void> {
  const response = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`, teamId),
    {
      method: 'PATCH',
      headers: buildHeaders(token),
      body: JSON.stringify({
        gitProviderOptions: { createDeployments: 'disabled' },
        gitComments: { onCommit: false, onPullRequest: false },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to disable Git integrations for project ${projectId}: ${response.status} ${await response.text()}`,
    );
  }
}

export type EnvUpsertResult = 'created' | 'updated';

/**
 * Writes one environment variable, reporting whether it existed.
 *
 * `PATCH` on an existing variable rather than delete-then-create: it keeps the variable's
 * id stable, and it means a failure mid-run cannot leave the project with the value
 * missing entirely. `upsertEnv` below is the delete-then-create form used by the service
 * deploys, where the project may have been created moments earlier and there is nothing
 * to preserve.
 */
export async function writeProjectEnv(
  token: string,
  projectId: string,
  key: string,
  value: string,
  existing: ReadonlyArray<{ id: string; key: string }>,
  teamId?: string,
): Promise<EnvUpsertResult> {
  const target = ['production', 'preview', 'development'];
  const match = existing.find((item) => item.key === key);

  const response = match
    ? await fetch(
        withTeam(`https://api.vercel.com/v9/projects/${projectId}/env/${match.id}`, teamId),
        {
          method: 'PATCH',
          headers: buildHeaders(token),
          body: JSON.stringify({ value, target, type: 'encrypted' }),
        },
      )
    : await fetch(withTeam(`https://api.vercel.com/v10/projects/${projectId}/env`, teamId), {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify({ key, value, target, type: 'encrypted' }),
      });

  if (!response.ok) {
    throw new Error(
      `Failed to ${match ? 'update' : 'create'} ${key}: ${response.status} ${await response.text()}`,
    );
  }
  return match ? 'updated' : 'created';
}

/** Lists a project's environment variables. */
export async function listProjectEnv(
  token: string,
  projectId: string,
  teamId?: string,
): Promise<Array<{ id: string; key: string }>> {
  const response = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${projectId}/env`, teamId),
    { headers: buildHeaders(token) },
  );
  if (!response.ok) {
    throw new Error(`Failed to list environment variables: ${response.status}`);
  }
  const data = (await response.json()) as { envs?: Array<{ id: string; key: string }> };
  return data.envs ?? [];
}

export async function upsertEnv(
  token: string,
  projectId: string,
  key: string,
  value: string,
  teamId?: string,
): Promise<void> {
  const listed = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${projectId}/env`, teamId),
    { headers: buildHeaders(token) },
  );
  const existing = listed.ok
    ? ((await listed.json()) as { envs?: Array<{ id: string; key: string }> }).envs?.filter(
        (item) => item.key === key,
      ) ?? []
    : [];

  for (const item of existing) {
    await fetch(
      withTeam(`https://api.vercel.com/v9/projects/${projectId}/env/${item.id}`, teamId),
      { method: 'DELETE', headers: buildHeaders(token) },
    );
  }

  const created = await fetch(
    withTeam(`https://api.vercel.com/v10/projects/${projectId}/env`, teamId),
    {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify({
        key,
        value,
        type: 'encrypted',
        target: ['production', 'preview', 'development'],
      }),
    },
  );
  if (!created.ok) {
    throw new Error(`Failed to set ${key}: ${created.status} ${await created.text()}`);
  }
  console.log(`  set ${key}`);
}

export interface RunVercelOptions {
  args: string[];
  projectId: string;
  serviceDir: string;
  token: string;
  teamId?: string;
}

const PINNED_VERCEL_CLI = '59.0.0';

function resolvePinnedVercelCli(): string {
  const packageJsonPath = path.join(process.cwd(), 'node_modules', 'vercel', 'package.json');
  const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    version?: string;
    bin?: string | Record<string, string>;
  };
  if (manifest.version !== PINNED_VERCEL_CLI) {
    throw new Error(
      `Vercel CLI must be the project-pinned ${PINNED_VERCEL_CLI}; found ${manifest.version ?? 'unknown'}.`,
    );
  }
  const bin =
    typeof manifest.bin === 'string'
      ? manifest.bin
      : manifest.bin?.vercel ?? manifest.bin?.vc;
  if (!bin) throw new Error('Pinned Vercel CLI is missing a bin entry.');
  return path.join(path.dirname(packageJsonPath), bin);
}

export function runVercel(options: RunVercelOptions): void {
  const command = process.execPath;
  const commandArgs = [resolvePinnedVercelCli(), ...options.args];

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    VERCEL_PROJECT_ID: options.projectId,
    VERCEL_TOKEN: options.token,
    // The Vercel CLI reads the local repository and attaches commit metadata to every
    // upload, which the dashboard renders as a GitHub source row (`Source: main <sha>`).
    // Only the GitHub-linked gova project may look Git-sourced, and runVercel serves the
    // GitHub-free accounts exclusively, so Git is pointed at a path that cannot exist:
    // the CLI metadata probe fails and the deployment is uploaded without commit data.
    GIT_DIR: path.join(options.serviceDir, '.asol-no-git-metadata'),
  };
  if (options.teamId) childEnv.VERCEL_ORG_ID = options.teamId;
  else delete childEnv.VERCEL_ORG_ID;

  execFileSync(command, commandArgs, {
    stdio: 'inherit',
    shell: false,
    cwd: options.serviceDir,
    env: childEnv,
  });
}

export interface DeployAccountServiceOptions {
  declaration: AccountDeclaration;
  syncSources: () => void;
  env?: Record<string, string | undefined>;
}

export async function deployAccountService(options: DeployAccountServiceOptions): Promise<void> {
  const { declaration, syncSources } = options;
  const env = options.env ?? process.env;

  if (!declaration.serviceDir) {
    throw new Error(`Account ${declaration.name} does not have a dedicated serviceDir`);
  }

  const token = env[declaration.tokenEnvVar];
  if (!token) {
    throw new Error(`${declaration.tokenEnvVar} is missing from environment`);
  }

  const missing = declaration.requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment values: ${missing.join(', ')}`);
  }

  const serviceDir = path.isAbsolute(declaration.serviceDir)
    ? declaration.serviceDir
    : path.join(process.cwd(), declaration.serviceDir);

  const teamId = await resolveAccountTeamId(declaration, env, token);
  const projectId = await ensureProject(token, declaration.project, teamId);

  console.log('\nSyncing environment variables:');
  for (const key of declaration.requiredEnv) {
    await upsertEnv(token, projectId, key, env[key]!, teamId);
  }
  for (const key of declaration.optionalEnv) {
    const value = env[key];
    if (value) await upsertEnv(token, projectId, key, value, teamId);
    else console.log(`  skip ${key} (not set locally)`);
  }

  console.log(`\nMirroring shared modules into ${declaration.serviceDir}/generated...`);
  syncSources();

  console.log(`\nUploading ${declaration.serviceDir} and building remotely...`);
  const runId = env.ASOL_DEPLOYMENT_RUN_ID?.trim() || `${declaration.name}-${Date.now()}`;
  const revision = env.ASOL_DEPLOYMENT_REVISION?.trim() || 'standalone';
  const comment =
    env.ASOL_DEPLOYMENT_COMMENT?.trim() ||
    `${declaration.name} production deploy ${new Date().toISOString()}`;

  runVercel({
    args: [
      'deploy',
      '--prod',
      '--yes',
      ...vercelDeploymentMetadata({ target: declaration.name, comment, runId, revision }),
    ],
    projectId,
    serviceDir,
    token,
    teamId,
  });

  const report = await waitForVercelProductionDeployment({
    token,
    project: declaration.project,
    target: declaration.name,
    account: teamId ?? 'personal',
    comment,
    teamId,
    runId,
  });

  printDeploymentReport(report);
  if (report.state !== 'READY') {
    throw new Error(`Vercel verification failed: ${report.message}`);
  }
}

export interface DeployAccountRootAppOptions {
  declaration: AccountDeclaration;
  env?: Record<string, string | undefined>;
}

/**
 * Deploy a full-application account from the repository root.
 *
 * Used for secondary application hosts that are never GitHub-linked. The upload
 * includes the whole monorepo; Vercel builds the main Next.js application from it.
 */
export async function deployAccountRootApp(
  options: DeployAccountRootAppOptions,
): Promise<void> {
  const { declaration } = options;
  const env = options.env ?? process.env;

  if (!declaration.deployFromRepositoryRoot) {
    throw new Error(`Account ${declaration.name} is not declared for repository-root deploy`);
  }

  const token = env[declaration.tokenEnvVar];
  if (!token) {
    throw new Error(`${declaration.tokenEnvVar} is missing from environment`);
  }

  const missing = declaration.requiredEnv.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment values: ${missing.join(', ')}`);
  }

  const repositoryRoot = process.cwd();
  const teamId = await resolveAccountTeamId(declaration, env, token);
  const projectId = await ensureProject(token, declaration.project, teamId);

  console.log('\nSyncing environment variables:');
  for (const key of declaration.requiredEnv) {
    await upsertEnv(token, projectId, key, env[key]!.trim(), teamId);
  }
  for (const key of declaration.optionalEnv) {
    const value = env[key]?.trim();
    if (value) await upsertEnv(token, projectId, key, value, teamId);
    else console.log(`  skip ${key} (not set locally)`);
  }

  console.log(`\nUploading repository root and building remotely (${declaration.project})...`);
  const runId = env.ASOL_DEPLOYMENT_RUN_ID?.trim() || `${declaration.name}-${Date.now()}`;
  const revision = env.ASOL_DEPLOYMENT_REVISION?.trim() || 'standalone';
  const comment =
    env.ASOL_DEPLOYMENT_COMMENT?.trim() ||
    `${declaration.name} production deploy ${new Date().toISOString()}`;

  runVercel({
    args: [
      'deploy',
      '--prod',
      '--yes',
      ...vercelDeploymentMetadata({ target: declaration.name, comment, runId, revision }),
    ],
    projectId,
    serviceDir: repositoryRoot,
    token,
    teamId,
  });

  const report = await waitForVercelProductionDeployment({
    token,
    project: declaration.project,
    target: declaration.name,
    account: teamId ?? 'personal',
    comment,
    teamId,
    runId,
  });

  printDeploymentReport(report);
  if (report.state !== 'READY') {
    throw new Error(`Vercel verification failed: ${report.message}`);
  }
}
