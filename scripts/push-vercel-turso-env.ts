import { existsSync, readFileSync } from 'fs';
import dotenv from 'dotenv';
import { DATABASE_SHARD_NAMES, envPrefixForShard } from '../src/modules/data-access/core/database/database-shards';
import {
  findProject,
  listProjectEnv,
  writeProjectEnv,
} from '@asol/vercel-deploy-core';

if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config({ path: '.env' });

const LEGACY_TURSO_KEYS = [
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'TURSO_PRODUCT_DATABASE_URL',
  'TURSO_PRODUCT_AUTH_TOKEN',
  'TURSO_ADVERTISEMENTS_DATABASE_URL',
  'TURSO_ADVERTISEMENTS_AUTH_TOKEN',
  // Separate Turso account. The main app still reads and writes device tokens
  // and preferences; only push fan-out moves to the notifications deployment.
  'TURSO_NOTIFICATIONS_DATABASE_URL',
  'TURSO_NOTIFICATIONS_AUTH_TOKEN',
] as const;

const SHARD_TURSO_KEYS = DATABASE_SHARD_NAMES.flatMap((databaseName) => {
  const prefix = envPrefixForShard(databaseName);
  return [`${prefix}_DATABASE_URL`, `${prefix}_DATABASE_AUTH_TOKEN`];
});

/**
 * The two halves of the notifications split.
 *
 * `ASOL_NOTIFICATION_GRANT_SECRET` must be byte-identical to the value on the
 * notifications account — the main app signs the forwarded send with it and the
 * service verifies it — so it is pushed from the same `.env` that
 * `npm run notifications:deploy` reads. Drift here fails every send with a 403.
 */
const NOTIFICATIONS_SERVICE_KEYS = [
  // Signs the grants the browser carries to the notifications service. Must be
  // byte-identical on both accounts or every grant is rejected as forged.
  'ASOL_NOTIFICATION_GRANT_SECRET',
  // Client-safe origin of the notifications service, baked into the bundle.
  'NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL',
  // Explicit, so the notification secrets no longer double as the session
  // signing key. Without it, rotating one silently signs every user out.
  'ASOL_SESSION_SIGNING_SECRET',
  // Client-safe origin of the products service, baked into the bundle.
  'NEXT_PUBLIC_ASOL_PRODUCTS_URL',
  // Client-safe origin of the orders service, baked into the bundle.
  'NEXT_PUBLIC_ASOL_ORDERS_URL',
  // Client-safe origin of the profiles service, baked into the bundle.
  'NEXT_PUBLIC_ASOL_PROFILES_URL',
  // Where OTA releases live. Explicit because the OTA config no longer falls
  // back to the product or general bucket — a fallback across accounts writes
  // to the wrong one instead of failing, which is how 3,463 build artefacts
  // ended up on the product account.
  'ASOL_OTA_R2_PUBLIC_URL',
  'ASOL_OTA_R2_PREFIX',
  // The explicit manifest URL wins over the derived one in
  // `getOtaApprovalServerConfig`, so leaving it out of this list does not make
  // it unused — it makes it stale. It was still pointing at the retired mirror
  // on the product account after OTA moved to its own account, which answers
  // 404: the approval API could not read the manifest, and failing closed means
  // nobody could install anything.
  'NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL',
] as const;

const VERCEL_KEYS = [...LEGACY_TURSO_KEYS, ...SHARD_TURSO_KEYS] as const;

const OPTIONAL_VERCEL_KEYS = NOTIFICATIONS_SERVICE_KEYS;

/**
 * The Vercel API layer lives in `@asol/vercel-deploy-core`, not here.
 *
 * This script used to carry its own `vercelFetch`, project lookup and env upsert — about
 * a hundred lines duplicating what the package already owns. Rule 1: one module holds the
 * logic in full. Two copies meant a change to Vercel's API, or to how tokens are handled,
 * had to be found in two places.
 */
function requireToken(): string {
  const token = process.env.VERCEL_TOKEN || process.env.VERCEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error('VERCEL_TOKEN or VERCEL_ACCESS_TOKEN is required in .env.local');
  }
  return token;
}

/** Team scope comes from the environment here; the service deploys resolve it from the API. */
function teamScope(): string | undefined {
  return process.env.VERCEL_ORG_ID || process.env.VERCEL_TEAM_ID || undefined;
}

async function resolveProjectId(token: string, teamId?: string): Promise<string> {
  const fromEnv = process.env.VERCEL_PROJECT_ID;
  if (fromEnv) return fromEnv;

  const projectName = process.env.VERCEL_PROJECT_NAME || 'gova';
  // `findProject`, never `ensureProject`: pushing environment variables must not create a
  // project because a name was mistyped.
  const projectId = await findProject(token, projectName, teamId);
  if (!projectId) {
    throw new Error(
      `Vercel project "${projectName}" not found. Set VERCEL_PROJECT_NAME or VERCEL_PROJECT_ID.`,
    );
  }
  return projectId;
}

async function main() {
  const missing = VERCEL_KEYS.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing local values for: ${missing.join(', ')}. Run npm run db:provision:turso first.`);
  }

  const token = requireToken();
  const teamId = teamScope();
  const projectId = await resolveProjectId(token, teamId);
  const existing = await listProjectEnv(token, projectId, teamId);

  console.log(`Vercel project: ${projectId}`);

  for (const key of VERCEL_KEYS) {
    const value = process.env[key]!.trim();
    const result = await writeProjectEnv(token, projectId, key, value, existing, teamId);
    console.log(`✅ ${key}: ${result}`);
  }

  for (const key of OPTIONAL_VERCEL_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      const result = await writeProjectEnv(token, projectId, key, value, existing, teamId);
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
