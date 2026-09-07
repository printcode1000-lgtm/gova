import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { createCorsPreflightProbeHeaders, inspectCorsPreflightResponse } from '@asol/cors';
import { buildDefaultR2CorsRules } from '../src/server/transport/r2-cors-policy';
import { getR2BucketCors, verifyCloudflareApiToken } from '../src/server/transport/r2-platform-api';
import { r2CorsRulesMatch } from '../src/server/transport/r2-cors-verification';
import { getStorageAccount, getStorageAccountIds } from '../src/domain/accounts/account-registry';
import { buildR2PublicObjectUrl, listR2Objects } from '../src/server/transport/r2-object-store';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local' });

const PROBE_ORIGIN = process.env.NEXT_PUBLIC_ASOL_PUBLIC_WEB_ORIGIN?.trim() || 'https://gova-swart.vercel.app';
const REQUESTED_HEADERS = ['if-none-match'] as const;

async function verifyAccount(accountId: string): Promise<string[]> {
  const problems: string[] = [];
  const account = getStorageAccount(accountId);
  try {
    if (!(await verifyCloudflareApiToken(accountId))) problems.push('Cloudflare API token is inactive');
    const actual = await getR2BucketCors(account.bucketName, accountId);
    if (!r2CorsRulesMatch(buildDefaultR2CorsRules(), actual)) problems.push('live bucket CORS differs from project policy');
  } catch (error) {
    problems.push(`bucket CORS could not be verified: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const sample = (await listR2Objects(undefined, accountId)).find((item) => item.key && item.size > 0);
    if (sample) {
      const url = buildR2PublicObjectUrl(sample.key, accountId);
      const response = await fetch(url, {
        method: 'OPTIONS',
        headers: createCorsPreflightProbeHeaders({
          origin: PROBE_ORIGIN,
          method: 'GET',
          requestedHeaders: REQUESTED_HEADERS,
        }),
      });
      if (response.status !== 204) problems.push(`public preflight returned HTTP ${response.status}`);
      problems.push(...inspectCorsPreflightResponse(response.headers, {
        origin: PROBE_ORIGIN,
        method: 'GET',
        requestedHeaders: REQUESTED_HEADERS,
        allowWildcardOrigin: true,
      }));
    }
  } catch (error) {
    problems.push(`public object CORS probe failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return [...new Set(problems)];
}

async function main(): Promise<void> {
  const failures: string[] = [];
  for (const accountId of getStorageAccountIds()) {
    const account = getStorageAccount(accountId);
    const problems = await verifyAccount(accountId);
    if (problems.length === 0) {
      console.log(`✅ R2 CORS verified: ${accountId}/${account.bucketName}`);
      continue;
    }
    failures.push(`${accountId}/${account.bucketName}: ${problems.join('; ')}`);
  }
  if (failures.length > 0) throw new Error(`R2 CORS verification failed:\n- ${failures.join('\n- ')}\nRun npm run r2:sync:cors after fixing the named account credential.`);
  console.log('✅ All registered R2 buckets match the browser CORS contract.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
