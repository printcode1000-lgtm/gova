import { execFileSync } from 'child_process';
import path from 'path';
import type { AccountDeclaration } from './declarations';
import {
  printDeploymentReport,
  vercelDeploymentMetadata,
  waitForVercelProductionDeployment,
} from './vercel-deployment-monitor';

export * from './declarations';
export * from './vercel-deployment-monitor';

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
  return data.id;
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

export function runVercel(options: RunVercelOptions): void {
  const npxCli = process.env.npm_execpath
    ? path.join(path.dirname(process.env.npm_execpath), 'npx-cli.js')
    : null;
  const command = npxCli ? process.execPath : 'npx';
  const commandArgs = npxCli
    ? [npxCli, '--yes', '--package=vercel@59.0.0', 'vercel', ...options.args]
    : ['--yes', '--package=vercel@59.0.0', 'vercel', ...options.args];

  execFileSync(command, commandArgs, {
    stdio: 'inherit',
    shell: false,
    cwd: options.serviceDir,
    env: {
      ...process.env,
      VERCEL_ORG_ID: options.teamId ?? '',
      VERCEL_PROJECT_ID: options.projectId,
      VERCEL_TOKEN: options.token,
    },
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

  const teamId = await resolveTeamId(token);
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
