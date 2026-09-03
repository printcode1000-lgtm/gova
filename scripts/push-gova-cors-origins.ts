#!/usr/bin/env tsx
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { DEVELOPMENT_ORIGINS, parseAllowedOrigins } from '@asol/cors';
import { API_BASE_URL } from '@asol/native-core';
import { listProjectEnv, upsertEnv } from '@asol/vercel-deploy-core';

import { loadReleaseEnvironment } from './load-release-env';

/**
 * Push the gova frontend's allowed-origin list to its Vercel project.
 *
 * `ASOL_CORS_ORIGINS` is a declared optional key of the gova frontend
 * (`GOVA_FRONTEND_OPTIONAL_ENV_KEYS`) and the only input to the exact allow-list the compatibility
 * boundary enforces. It holds public origins and no credential.
 *
 * It is derived here rather than typed into a dashboard, because a hand-entered list is a fact
 * about production that no test can see and no review can catch drifting. The boundary allows
 * nothing that is not named in it: a missing native shell origin does not degrade to a CORS error,
 * it surfaces to users as `Unable to reach the server`, and the origin that goes missing is the one
 * nobody browses from — an installed Android or iOS build. Deriving the list from the same
 * constants the application ships with is what keeps that from happening silently.
 *
 * Run before releasing a build whose `/api/*` boundary is no longer covered by the wildcard header
 * table in `next.config.ts`. The variable only takes effect on a deployment created after it is set.
 */
const ROOT = process.cwd();
const KEY = 'ASOL_CORS_ORIGINS';

/**
 * gova's own production aliases.
 *
 * `API_BASE_URL` is the canonical one — the address every native shell is built against. The other
 * two are the aliases Vercel keeps pointed at the same production deployment; naming them means an
 * alias swap cannot lock the application out of its own API.
 */
function productionOrigins(): string[] {
  return [
    API_BASE_URL.replace(/\/$/, ''),
    'https://gova-hesham-101.vercel.app',
    'https://gova-git-main-hesham-101.vercel.app',
  ];
}

/**
 * The shell and local origins.
 *
 * `DEVELOPMENT_ORIGINS` is named for where it came from, not for where it is needed:
 * `capacitor://localhost`, `https://localhost` (Android) and `ionic://localhost` are the origins
 * every *installed* build speaks from, in production. Dropping them to "keep production clean"
 * takes the mobile applications offline.
 */
function shellAndLocalOrigins(): readonly string[] {
  return DEVELOPMENT_ORIGINS;
}

export function govaCorsOrigins(): string[] {
  const origins = [...productionOrigins(), ...shellAndLocalOrigins()];
  const unique = [...new Set(origins.map((origin) => origin.trim()).filter(Boolean))];

  // A value this function builds is a value the boundary must be able to parse back. Round-tripping
  // it here is cheap and catches a stray comma or blank entry before it reaches production, where
  // the symptom is a refused origin and not an error.
  const encoded = unique.join(',');
  const decoded = parseAllowedOrigins(encoded);
  if (decoded.length !== unique.length) {
    throw new Error(
      `${KEY} does not round-trip: built ${unique.length} origins, parsed back ${decoded.length}.`,
    );
  }
  return unique;
}

function projectLink(): { projectId: string; orgId?: string } {
  const linkPath = path.join(ROOT, '.vercel', 'project.json');
  if (!existsSync(linkPath)) {
    throw new Error('.vercel/project.json is required to identify the gova project.');
  }
  const link = JSON.parse(readFileSync(linkPath, 'utf8')) as { projectId?: string; orgId?: string };
  if (!link.projectId) throw new Error('The gova Vercel project link has no projectId.');
  return { projectId: link.projectId, orgId: link.orgId };
}

async function main(): Promise<void> {
  loadReleaseEnvironment();

  const origins = govaCorsOrigins();
  console.log(`[gova:cors:push] ${KEY} — ${origins.length} origin(s):`);
  for (const origin of origins) console.log(`  ${origin}`);

  if (!process.argv.includes('--apply')) {
    console.log('\n[gova:cors:push] Dry run. Re-run with --apply to write it to Vercel.');
    return;
  }

  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) throw new Error('VERCEL_TOKEN is required to write the gova project environment.');

  const link = projectLink();
  await upsertEnv(token, link.projectId, KEY, origins.join(','), link.orgId);

  const entries = (await listProjectEnv(token, link.projectId, link.orgId)).filter(
    (entry) => entry.key === KEY,
  );
  if (entries.length === 0) {
    throw new Error(`${KEY} is still absent from the gova project after the write.`);
  }
  console.log(
    `[gova:cors:push] ${KEY} is set (${entries.length} entry). ` +
      'It takes effect on the next deployment, not on the one already serving.',
  );
}

main().catch((error) => {
  console.error(`[gova:cors:push] FAILED — ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
