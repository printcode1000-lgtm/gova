import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

/**
 * Deploys the orders service to its own Vercel account.
 *
 * Three constraints shape this script:
 *
 * 1. Only `services/orders` is uploaded. The service imports shared
 *    modules through `generated/`, which is mirrored from `src/` first, so the
 *    upload is self-contained and the rest of the repository never leaves this
 *    machine.
 * 2. The notifications project is NOT connected to GitHub. It changes only when
 *    this command runs — nothing is triggered by a push.
 * 3. The main `gova` project stays connected to GitHub and keeps auto-deploying.
 *    Nothing here touches its link: the CLI runs with `services/orders`
 *    as its working directory, so it writes that folder's `.vercel`, not the
 *    repository root's.
 *
 * Because the uploaded app has two API routes and no pages, its remote build
 * needs no database at all — which is what keeps the users, product, and shard
 * credentials off the notifications account.
 */

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const PROJECT_NAME = 'asol-orders';
const SERVICE_DIR = path.join(process.cwd(), 'services', 'orders');

const token = process.env.VERCEL_ORDERS_TOKEN;
if (!token) {
  console.error('VERCEL_ORDERS_TOKEN is missing from .env / .env.local');
  process.exit(1);
}

/** Pushed to the notifications project. Anything absent locally is skipped. */
const REQUIRED_ENV_KEYS = [
  'ORDERS_CORE_DATABASE_URL',
  'ORDERS_CORE_DATABASE_AUTH_TOKEN',
] as const;

/** The remaining eight shards. A missing one leaves that slice of an order unreadable. */
const OPTIONAL_ENV_KEYS = [
  'ORDERS_ITEMS_DATABASE_URL','ORDERS_ITEMS_DATABASE_AUTH_TOKEN',
  'ORDERS_FULFILLMENT_DATABASE_URL','ORDERS_FULFILLMENT_DATABASE_AUTH_TOKEN',
  'ORDERS_DELIVERY_PLANS_DATABASE_URL','ORDERS_DELIVERY_PLANS_DATABASE_AUTH_TOKEN',
  'ORDERS_SHIPPING_QUOTES_DATABASE_URL','ORDERS_SHIPPING_QUOTES_DATABASE_AUTH_TOKEN',
  'ORDERS_PAYMENTS_DATABASE_URL','ORDERS_PAYMENTS_DATABASE_AUTH_TOKEN',
  'ORDERS_REFUNDS_DATABASE_URL','ORDERS_REFUNDS_DATABASE_AUTH_TOKEN',
  'ORDERS_AFTER_SALES_DATABASE_URL','ORDERS_AFTER_SALES_DATABASE_AUTH_TOKEN',
  'ORDERS_DISPUTES_AUDIT_DATABASE_URL','ORDERS_DISPUTES_AUDIT_DATABASE_AUTH_TOKEN',
] as const;

interface VercelHeaders {
  Authorization: string;
  'Content-Type': string;
}

function headers(): VercelHeaders {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function resolveTeamId(): Promise<string | undefined> {
  const response = await fetch('https://api.vercel.com/v2/teams', { headers: headers() });
  if (!response.ok) return undefined;
  const data = (await response.json()) as { teams?: Array<{ id: string; slug: string }> };
  const team = data.teams?.[0];
  if (team) console.log(`Vercel scope: team ${team.slug} (${team.id})`);
  return team?.id;
}

function withTeam(url: string, teamId?: string): string {
  if (!teamId) return url;
  return `${url}${url.includes('?') ? '&' : '?'}teamId=${teamId}`;
}

async function ensureProject(teamId?: string): Promise<string> {
  const found = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${PROJECT_NAME}`, teamId),
    { headers: headers() },
  );
  if (found.ok) {
    const data = (await found.json()) as { id: string };
    console.log(`Project exists: ${PROJECT_NAME} (${data.id})`);
    return data.id;
  }

  // No `gitRepository` field: the project stays disconnected from GitHub on
  // purpose, so only this command can change what is deployed.
  const created = await fetch(withTeam('https://api.vercel.com/v10/projects', teamId), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name: PROJECT_NAME, framework: 'nextjs' }),
  });
  if (!created.ok) {
    throw new Error(`Failed to create project: ${created.status} ${await created.text()}`);
  }
  const data = (await created.json()) as { id: string };
  console.log(`Project created: ${PROJECT_NAME} (${data.id})`);
  return data.id;
}

async function upsertEnv(projectId: string, key: string, value: string, teamId?: string): Promise<void> {
  const listed = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${projectId}/env`, teamId),
    { headers: headers() },
  );
  const existing = listed.ok
    ? ((await listed.json()) as { envs?: Array<{ id: string; key: string }> }).envs?.filter(
        (item) => item.key === key,
      ) ?? []
    : [];

  for (const item of existing) {
    await fetch(
      withTeam(`https://api.vercel.com/v9/projects/${projectId}/env/${item.id}`, teamId),
      { method: 'DELETE', headers: headers() },
    );
  }

  const created = await fetch(
    withTeam(`https://api.vercel.com/v10/projects/${projectId}/env`, teamId),
    {
      method: 'POST',
      headers: headers(),
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

function runVercel(args: string[], projectId: string, teamId?: string): void {
  execFileSync('npx', ['--yes', '--package=vercel@59.0.0', 'vercel', ...args], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    // Everything the CLI reads and writes stays inside the service folder.
    cwd: SERVICE_DIR,
    env: {
      ...process.env,
      // How the CLI targets a project without an interactive link step.
      VERCEL_ORG_ID: teamId ?? '',
      VERCEL_PROJECT_ID: projectId,
      // The main app's own token must not leak into this invocation.
      VERCEL_TOKEN: token,
    },
  });
}

function syncSharedSources(): void {
  execFileSync('npx', ['tsx', 'scripts/sync-orders-service-sources.ts'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    cwd: process.cwd(),
  });
}

async function main(): Promise<void> {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment values: ${missing.join(', ')}`);
    process.exit(1);
  }

  const teamId = await resolveTeamId();
  const projectId = await ensureProject(teamId);

  console.log('\nSyncing environment variables:');
  for (const key of REQUIRED_ENV_KEYS) {
    await upsertEnv(projectId, key, process.env[key]!, teamId);
  }
  for (const key of OPTIONAL_ENV_KEYS) {
    const value = process.env[key];
    if (value) await upsertEnv(projectId, key, value, teamId);
    else console.log(`  skip ${key} (not set locally)`);
  }
  // The service is never told where the main app is: it has no reason to call it.

  console.log('\nMirroring shared modules into services/orders/generated...');
  syncSharedSources();

  console.log('\nUploading services/orders and building remotely...');
  runVercel(['deploy', '--prod', '--yes'], projectId, teamId);

  console.log(
    "\nDone. Set NEXT_PUBLIC_ASOL_ORDERS_URL on the main app to this deployment's " +
      'origin so the browser bridge sends order reads there.',
  );
}

main().catch((error) => {
  console.error('Notifications service deploy failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
