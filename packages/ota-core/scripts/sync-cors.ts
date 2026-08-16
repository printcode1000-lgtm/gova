import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { getOtaR2CloudflareCredentials, getOtaR2S3Credentials } from '../src/publishing/config/ota-r2-target';

if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config({ path: '.env' });

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

interface R2CorsRule {
  id?: string;
  allowed: {
    origins: string[];
    methods: string[];
    headers?: string[];
  };
  exposeHeaders?: string[];
  maxAgeSeconds?: number;
}

function buildDefaultOtaCorsRules(): R2CorsRule[] {
  const rawOrigins = process.env.ASOL_CORS_ORIGINS;
  const origins = rawOrigins ? rawOrigins.split(',').map((s) => s.trim()).filter(Boolean) : ['*'];
  return [
    {
      id: 'asol-ota-browser-upload',
      allowed: {
        origins,
        methods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        headers: ['*'],
      },
      exposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
      maxAgeSeconds: 3600,
    },
  ];
}

async function verifyOtaToken(cloudflare: { accountId: string; apiToken: string }): Promise<boolean> {
  const response = await fetch(`${CF_API_BASE}/accounts/${cloudflare.accountId}/tokens/verify`, {
    headers: { Authorization: `Bearer ${cloudflare.apiToken}` },
  });
  const body = (await response.json()) as { success: boolean; result?: { status: string } };
  return response.ok && body.success && body.result?.status === 'active';
}

async function getOtaBucketCors(
  cloudflare: { accountId: string; apiToken: string },
  bucket: string,
): Promise<R2CorsRule[]> {
  const response = await fetch(
    `${CF_API_BASE}/accounts/${cloudflare.accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`,
    {
      headers: {
        Authorization: `Bearer ${cloudflare.apiToken}`,
        'Content-Type': 'application/json',
      },
    },
  );
  if (response.status === 404) return [];
  const body = (await response.json()) as { success: boolean; result?: { rules?: R2CorsRule[] } };
  return body.result?.rules ?? [];
}

async function putOtaBucketCors(
  cloudflare: { accountId: string; apiToken: string },
  bucket: string,
  rules: R2CorsRule[],
): Promise<R2CorsRule[]> {
  const response = await fetch(
    `${CF_API_BASE}/accounts/${cloudflare.accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${cloudflare.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rules }),
    },
  );
  const body = (await response.json()) as { success: boolean; result?: { rules?: R2CorsRule[] } };
  if (!response.ok || !body.success) {
    throw new Error(`Failed to update OTA bucket CORS: ${response.statusText}`);
  }
  return body.result?.rules ?? rules;
}

async function main() {
  console.log('🔐 Verifying Cloudflare OTA API token...');
  const cloudflare = getOtaR2CloudflareCredentials();
  const s3 = getOtaR2S3Credentials();

  const active = await verifyOtaToken(cloudflare);
  if (!active) {
    console.error('❌ Cloudflare OTA API token verification failed.');
    process.exit(1);
  }
  console.log('✅ OTA Token active');

  const bucket = s3.bucketName;
  const rules = buildDefaultOtaCorsRules();

  console.log(`📋 Current CORS for OTA bucket "${bucket}":`);
  const before = await getOtaBucketCors(cloudflare, bucket);
  console.log(JSON.stringify(before, null, 2));

  console.log(`🔄 Applying full CORS (GET, PUT, POST, DELETE, HEAD) to OTA bucket...`);
  const after = await putOtaBucketCors(cloudflare, bucket, rules);
  console.log('✅ OTA CORS updated:');
  console.log(JSON.stringify(after, null, 2));
}

main().catch((error) => {
  console.error('❌ OTA R2 CORS sync failed:', error);
  process.exit(1);
});
