import { existsSync } from 'fs';
import dotenv from 'dotenv';

import {
  SUBMAIN_DECLARATION,
  assertProjectNotGitLinked,
  deleteProject,
  deployAccountRootApp,
  ensureProject,
  getProject,
  resolveTeamId,
} from '@asol/vercel-deploy-core';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

async function resolveSubmainTeamId(
  env: NodeJS.ProcessEnv,
  token: string,
): Promise<string> {
  const teamId =
    (await resolveTeamId(token)) ??
    env[SUBMAIN_DECLARATION.teamIdEnvVar ?? '']?.trim();
  if (!teamId) {
    throw new Error(
      `${SUBMAIN_DECLARATION.teamIdEnvVar ?? 'VERCEL_SUBMAIN_ORG_ID'} is required when the token cannot list teams.`,
    );
  }
  return teamId;
}

async function main(): Promise<void> {
  const token = process.env.VERCEL_SUBMAIN_TOKEN?.trim();
  if (!token) {
    throw new Error('VERCEL_SUBMAIN_TOKEN is required in .env.local or .env');
  }

  const teamId = await resolveSubmainTeamId(process.env, token);
  const projectName = SUBMAIN_DECLARATION.project;
  const legacyProjectNames = ['submain'].filter((name) => name !== projectName);

  for (const legacyName of legacyProjectNames) {
    if (await getProject(token, legacyName, teamId)) {
      console.log(`Removing legacy Vercel project: ${legacyName}`);
      await deleteProject(token, legacyName, teamId);
    }
  }

  const existing = await getProject(token, projectName, teamId);
  if (existing) {
    assertProjectNotGitLinked(existing, projectName);
    await deleteProject(token, projectName, teamId);
  } else {
    console.log(`No existing Vercel project named ${projectName}.`);
  }

  const projectId = await ensureProject(token, projectName, teamId);
  const created = await getProject(token, projectName, teamId);
  assertProjectNotGitLinked(created, projectName);
  console.log(`Fresh ${projectName} project is GitHub-free (${projectId}).`);

  console.log('\nDeploying submain and syncing runtime environment...');
  await deployAccountRootApp({ declaration: SUBMAIN_DECLARATION });
}

main().catch((error) => {
  console.error(
    'Submain Vercel recreate failed:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
