import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { GOVA_KEPT_API_ROUTES } from './tree';

/**
 * What the built gova artifact is allowed to contain.
 *
 * The build view decides what Vercel compiles; this reads what it actually
 * produced. Both are needed: the view is an input and can be bypassed by
 * building the repository root directly, while `.next` is the thing that ships.
 * A guard that only inspects sources proves nothing about the artifact.
 */
export interface GovaArtifactReport {
  apiFunctions: readonly string[];
  forbiddenPackages: readonly string[];
  forbiddenEnvNames: readonly string[];
}

/**
 * Business capability packages that must not appear in a gova server trace.
 *
 * Names, not paths: the trace records module locations, and a package that
 * reaches the artifact does so under `node_modules/` or `packages/` regardless
 * of which import pulled it in.
 */
const FORBIDDEN_TRACE_PACKAGES = [
  '@asol/data-core',
  '@asol/storage-core',
  '@asol/orders-core',
  '@asol/notifications-core',
  '@asol/backup-core',
  '@asol/data-health-core',
  '@asol/release-core',
  '@asol/vercel-deploy-core',
  '@libsql/client',
  'better-sqlite3',
  'drizzle-orm',
  '@aws-sdk/client-s3',
  'nodemailer',
] as const;

/**
 * Secret families a frontend deployment has no reason to require.
 *
 * Matched against names only. The check never reads a value, so running it
 * cannot leak one, and a report that named values could not be pasted into an
 * issue.
 */
const FORBIDDEN_ENV_NAMES = [
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'ASOL_SESSION_SIGNING_SECRET',
  'ASOL_NOTIFICATION_GRANT_SECRET',
  'R2_SECRET_ACCESS_KEY',
  'R2_ACCESS_KEY_ID',
  'VERCEL_TOKEN',
  'VERCEL_CONTROL_TOKEN',
  'ASOL_DEPLOY_CALLBACK_SECRET',
  'PASSWORD_RECOVERY_GMAIL_APP_PASSWORD',
  'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON',
] as const;

function listApiFunctionRoutes(appServerDir: string): string[] {
  const apiDir = path.join(appServerDir, 'api');
  if (!existsSync(apiDir)) return [];
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      // Next emits one `route.js` per compiled API function.
      else if (entry.name === 'route.js') {
        found.push(path.relative(apiDir, path.dirname(full)).split(path.sep).join('/'));
      }
    }
  };
  walk(apiDir);
  return found.sort();
}

function readTraceText(appServerDir: string): string {
  const parts: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.nft.json')) parts.push(readFileSync(full, 'utf8'));
    }
  };
  walk(appServerDir);
  return parts.join('\n');
}

/**
 * Fails unless the built artifact is a frontend.
 *
 * Throws with every finding at once rather than the first: a build gate that
 * reports one violation per run turns a ten-minute build into ten of them.
 */
export function assertGovaArtifact(root: string): GovaArtifactReport {
  const appServerDir = path.join(root, '.next', 'server', 'app');
  if (!existsSync(appServerDir)) {
    throw new Error('gova artifact gate: .next/server/app is missing; build gova first.');
  }

  const allowed = new Set<string>(GOVA_KEPT_API_ROUTES);
  const apiFunctions = listApiFunctionRoutes(appServerDir);
  const unexpected = apiFunctions.filter((route) => !allowed.has(route.split('/')[0]!));
  const developmentRoutes = apiFunctions.filter((route) => route === 'dev' || route.startsWith('dev/'));

  const trace = readTraceText(appServerDir);
  const forbiddenPackages = FORBIDDEN_TRACE_PACKAGES.filter((name) => trace.includes(name));
  const forbiddenEnvNames = FORBIDDEN_ENV_NAMES.filter((name) => trace.includes(name));

  const failures: string[] = [];
  if (unexpected.length > 0) {
    failures.push(
      `Business API functions in the gova artifact: ${unexpected.join(', ')}. ` +
        'gova redirects these; it must not compile them.',
    );
  }
  if (developmentRoutes.length > 0) {
    failures.push(`Development API in a release artifact: ${developmentRoutes.join(', ')}.`);
  }
  if (forbiddenPackages.length > 0) {
    failures.push(`Business capability in the gova server trace: ${forbiddenPackages.join(', ')}.`);
  }
  if (forbiddenEnvNames.length > 0) {
    failures.push(`gova trace requires secrets it must not hold: ${forbiddenEnvNames.join(', ')}.`);
  }
  if (failures.length > 0) {
    throw new Error(`gova artifact gate failed:\n- ${failures.join('\n- ')}`);
  }

  return { apiFunctions, forbiddenPackages, forbiddenEnvNames };
}
