import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { GOVA_DECLARATION } from '@asol/account-declarations';
import {
  deleteProjectEnv,
  findProject,
  listProjectEnv,
  writeProjectEnv,
} from '@asol/vercel-deploy-core';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

function requireToken(): string {
  const token = process.env.VERCEL_TOKEN?.trim() || process.env.VERCEL_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('VERCEL_TOKEN or VERCEL_ACCESS_TOKEN is required locally.');
  return token;
}

function teamScope(): string | undefined {
  return process.env.VERCEL_ORG_ID?.trim() || process.env.VERCEL_TEAM_ID?.trim() || undefined;
}

async function resolveProjectId(token: string, teamId?: string): Promise<string> {
  const fromEnv = process.env.VERCEL_PROJECT_ID?.trim();
  if (fromEnv) return fromEnv;

  const projectName = process.env.VERCEL_PROJECT_NAME?.trim() || GOVA_DECLARATION.project;
  const projectId = await findProject(token, projectName, teamId);
  if (!projectId) {
    throw new Error(
      `Vercel project "${projectName}" not found. Set VERCEL_PROJECT_NAME or VERCEL_PROJECT_ID.`,
    );
  }
  return projectId;
}

/**
 * Reconcile the GitHub-linked gova project to its frontend-only declaration.
 *
 * Historical versions of this command pushed Turso, signing, R2, and push
 * credentials into gova. The cutover makes that impossible: gova receives only
 * the seven owner origins plus explicitly declared frontend-safe optional keys.
 * Existing undeclared entries are deleted by id without reading or logging their
 * values.
 */
async function main(): Promise<void> {
  const missing = GOVA_DECLARATION.requiredEnv.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required gova frontend values: ${missing.join(', ')}.`);
  }

  const token = requireToken();
  const teamId = teamScope();
  const projectId = await resolveProjectId(token, teamId);
  const existing = await listProjectEnv(token, projectId, teamId);
  const allowed = new Set<string>([
    ...GOVA_DECLARATION.requiredEnv,
    ...GOVA_DECLARATION.optionalEnv,
  ]);

  console.log(`Vercel gova project: ${projectId}`);

  for (const key of GOVA_DECLARATION.requiredEnv) {
    const result = await writeProjectEnv(token, projectId, key, process.env[key]!.trim(), existing, teamId);
    console.log(`✅ ${key}: ${result}`);
  }

  for (const key of GOVA_DECLARATION.optionalEnv) {
    const value = process.env[key]?.trim();
    if (!value) continue;
    const result = await writeProjectEnv(token, projectId, key, value, existing, teamId);
    console.log(`✅ ${key}: ${result}`);
  }

  for (const entry of existing) {
    if (allowed.has(entry.key)) continue;
    await deleteProjectEnv(token, projectId, entry.id, teamId);
    console.log(`🧹 removed undeclared gova env: ${entry.key}`);
  }

  console.log('🎉 gova frontend environment reconciled to its declaration.');
  console.log('   Redeploy gova after the seven owner runtimes are READY for the release SHA.');
}

void main().catch((error) => {
  console.error('❌ Failed to reconcile gova Vercel env:', error instanceof Error ? error.message : error);
  process.exit(1);
});
