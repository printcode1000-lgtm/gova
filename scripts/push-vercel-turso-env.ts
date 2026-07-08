import { existsSync, readFileSync } from 'fs';
import dotenv from 'dotenv';

if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config({ path: '.env' });

const VERCEL_KEYS = [
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'TURSO_PROFILE_DATABASE_URL',
  'TURSO_PROFILE_AUTH_TOKEN',
] as const;

const OPTIONAL_VERCEL_KEYS = [
  'TURSO_PRODUCT_DATABASE_URL',
  'TURSO_PRODUCT_AUTH_TOKEN',
  'TURSO_ADVERTISEMENTS_DATABASE_URL',
  'TURSO_ADVERTISEMENTS_AUTH_TOKEN',
] as const;

async function vercelFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = process.env.VERCEL_TOKEN || process.env.VERCEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error('VERCEL_TOKEN or VERCEL_ACCESS_TOKEN is required in .env.local');
  }

  const teamId = process.env.VERCEL_ORG_ID || process.env.VERCEL_TEAM_ID;
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) url.searchParams.set('teamId', teamId);

  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

async function resolveProjectId(): Promise<string> {
  const fromEnv = process.env.VERCEL_PROJECT_ID;
  if (fromEnv) return fromEnv;

  const projectName = process.env.VERCEL_PROJECT_NAME || 'gova';
  const response = await vercelFetch('/v9/projects');
  if (!response.ok) {
    throw new Error(`Failed to list Vercel projects (${response.status})`);
  }

  const data = (await response.json()) as { projects: Array<{ id: string; name: string }> };
  const project = data.projects.find((p) => p.name === projectName);
  if (!project) {
    const names = data.projects.map((p) => p.name).join(', ');
    throw new Error(`Project "${projectName}" not found. Available: ${names}`);
  }

  return project.id;
}

async function listProjectEnv(projectId: string): Promise<Array<{ id: string; key: string; target: string[] }>> {
  const response = await vercelFetch(`/v9/projects/${projectId}/env`);
  if (!response.ok) {
    throw new Error(`Failed to list env vars (${response.status})`);
  }

  const data = (await response.json()) as { envs: Array<{ id: string; key: string; target: string[] }> };
  return data.envs;
}

async function upsertEnvVar(
  projectId: string,
  key: string,
  value: string,
  existing: Array<{ id: string; key: string; target: string[] }>
): Promise<'created' | 'updated' | 'unchanged'> {
  const targets = ['production', 'preview', 'development'] as const;
  const match = existing.find((env) => env.key === key);

  if (match) {
    const response = await vercelFetch(`/v9/projects/${projectId}/env/${match.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        value,
        target: [...targets],
        type: 'encrypted',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to update ${key} (${response.status}): ${text}`);
    }

    return 'updated';
  }

  const response = await vercelFetch(`/v10/projects/${projectId}/env`, {
    method: 'POST',
    body: JSON.stringify({
      key,
      value,
      type: 'encrypted',
      target: [...targets],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create ${key} (${response.status}): ${text}`);
  }

  return 'created';
}

async function main() {
  const missing = VERCEL_KEYS.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing local values for: ${missing.join(', ')}. Run npm run db:provision:turso first.`);
  }

  const projectId = await resolveProjectId();
  const existing = await listProjectEnv(projectId);

  console.log(`📦 Vercel project: ${projectId}`);

  for (const key of VERCEL_KEYS) {
    const value = process.env[key]!.trim();
    const result = await upsertEnvVar(projectId, key, value, existing);
    console.log(`✅ ${key}: ${result}`);
  }

  for (const key of OPTIONAL_VERCEL_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      const result = await upsertEnvVar(projectId, key, value, existing);
      console.log(`✅ ${key} (Optional): ${result}`);
    }
  }

  console.log('🎉 Turso env vars synced to Vercel (production, preview, development).');
  console.log('   Redeploy the project for the build to pick them up.');
}

main().catch((error) => {
  console.error('❌ Failed to sync Vercel env:', error instanceof Error ? error.message : error);
  process.exit(1);
});
