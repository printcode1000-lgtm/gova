import dotenv from 'dotenv';
import { existsSync } from 'fs';

// Load env files
if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config({ path: '.env' });
}

const vercelToken = process.env.VERCEL_TOKEN;
const vercelOrgId = process.env.VERCEL_ORG_ID;

if (!vercelToken || !vercelOrgId) {
  console.error('❌ Error: VERCEL_TOKEN or VERCEL_ORG_ID is missing from .env/.env.local files.');
  process.exit(1);
}

const PROJECT_NAME = 'gova';

// Environment variables to push to Vercel Production
const ENV_VARS: Array<{ key: string; value: string; target: string[] }> = [
  {
    key: 'TURSO_DATABASE_URL',
    value: process.env.TURSO_DATABASE_URL || '',
    target: ['production', 'preview'],
  },
  {
    key: 'TURSO_AUTH_TOKEN',
    value: process.env.TURSO_AUTH_TOKEN || '',
    target: ['production', 'preview'],
  },
];

async function getHeaders() {
  return {
    Authorization: `Bearer ${vercelToken}`,
    'Content-Type': 'application/json',
  };
}

async function getProject(): Promise<string | null> {
  const url = `https://api.vercel.com/v9/projects/${PROJECT_NAME}?teamId=${vercelOrgId}`;
  const res = await fetch(url, { headers: await getHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  return data.id || null;
}

async function createProject(): Promise<string> {
  console.log(`🚀 Creating Vercel project "${PROJECT_NAME}"...`);
  const res = await fetch(`https://api.vercel.com/v10/projects?teamId=${vercelOrgId}`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({
      name: PROJECT_NAME,
      framework: 'nextjs',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create project: ${await res.text()}`);
  }

  const data = await res.json();
  console.log(`✅ Project "${PROJECT_NAME}" created with ID: ${data.id}`);
  return data.id;
}

async function pushEnvVars(projectId: string) {
  console.log(`📤 Pushing environment variables to Vercel project (ID: ${projectId})...`);

  // First, get existing env vars to avoid duplicates
  const existingRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${vercelOrgId}`,
    { headers: await getHeaders() }
  );
  const existingData = await existingRes.json();
  const existingEnvs: Array<{ id: string; key: string }> = existingData.envs || [];

  for (const envVar of ENV_VARS) {
    if (!envVar.value) {
      console.log(`⚠️ Skipping "${envVar.key}": value is empty.`);
      continue;
    }

    // Check if it already exists
    const existing = existingEnvs.find((e) => e.key === envVar.key);

    if (existing) {
      // Update existing variable
      console.log(`🔄 Updating existing env var: ${envVar.key}`);
      const updateRes = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}?teamId=${vercelOrgId}`,
        {
          method: 'PATCH',
          headers: await getHeaders(),
          body: JSON.stringify({
            value: envVar.value,
            target: envVar.target,
            type: 'encrypted',
          }),
        }
      );

      if (!updateRes.ok) {
        console.error(`❌ Failed to update ${envVar.key}: ${await updateRes.text()}`);
      } else {
        console.log(`✅ Updated: ${envVar.key}`);
      }
    } else {
      // Create new variable
      console.log(`➕ Creating env var: ${envVar.key}`);
      const createRes = await fetch(
        `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${vercelOrgId}`,
        {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify({
            key: envVar.key,
            value: envVar.value,
            target: envVar.target,
            type: 'encrypted',
          }),
        }
      );

      if (!createRes.ok) {
        console.error(`❌ Failed to create ${envVar.key}: ${await createRes.text()}`);
      } else {
        console.log(`✅ Created: ${envVar.key}`);
      }
    }
  }
}

async function main() {
  try {
    console.log(`🔍 Looking for Vercel project "${PROJECT_NAME}"...`);
    let projectId = await getProject();

    if (!projectId) {
      console.log(`ℹ️ Project "${PROJECT_NAME}" not found on Vercel. Creating it...`);
      projectId = await createProject();
    } else {
      console.log(`✅ Found existing Vercel project (ID: ${projectId})`);
    }

    await pushEnvVars(projectId);

    console.log('\n🎉 Vercel configuration completed successfully!');
    console.log(`📋 Summary:`);
    console.log(`   - Project: ${PROJECT_NAME}`);
    console.log(`   - Team ID: ${vercelOrgId}`);
    console.log(`   - Database URL: ${process.env.TURSO_DATABASE_URL}`);
    console.log(`   - Auth Token: [ENCRYPTED]`);
    console.log(`\n🚀 Next step: Deploy with "npx vercel deploy --prod" or push to GitHub to trigger Actions.`);
  } catch (error) {
    console.error('❌ Error during Vercel configuration:', error);
    process.exit(1);
  }
}

main();
