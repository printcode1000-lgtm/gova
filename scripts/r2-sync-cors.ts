import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { buildDefaultR2CorsRules } from '../src/core/provisioning/r2-cors-policy';
import {
  getR2BucketCors,
  putR2BucketCors,
  verifyCloudflareApiToken,
} from '../src/core/provisioning/r2-platform-api';

if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config({ path: '.env' });

async function main() {
  const required = ['R2_ACCOUNT_ID', 'R2_API_TOKEN', 'R2_BUCKET_NAME'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`❌ Missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('🔐 Verifying Cloudflare API token...');
  const active = await verifyCloudflareApiToken();
  if (!active) {
    console.error('❌ Cloudflare API token verification failed.');
    process.exit(1);
  }
  console.log('✅ Token active');

  const bucket = process.env.R2_BUCKET_NAME!;
  const rules = buildDefaultR2CorsRules();

  console.log(`📋 Current CORS for "${bucket}":`);
  const before = await getR2BucketCors(bucket);
  console.log(JSON.stringify(before, null, 2));

  console.log(`🔄 Applying full CORS (GET, PUT, POST, DELETE, HEAD)...`);
  const after = await putR2BucketCors(rules, bucket);
  console.log('✅ CORS updated:');
  console.log(JSON.stringify(after, null, 2));
}

main().catch((error) => {
  console.error('❌ R2 CORS sync failed:', error);
  process.exit(1);
});
