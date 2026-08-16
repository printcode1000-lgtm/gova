import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { buildDefaultR2CorsRules } from '../src/server/transport/r2-cors-policy';
import {
  getR2BucketCors,
  putR2BucketCors,
  verifyCloudflareApiToken,
} from '../src/server/transport/r2-platform-api';
import { getStorageAccountIds, getStorageAccount } from '../src/domain/accounts/account-registry';

if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config({ path: '.env' });

async function syncAccountCors(accountId: string) {
  const account = getStorageAccount(accountId);
  console.log(`\n🔐 Verifying Cloudflare API token for account "${accountId}" (${account.envPrefix})...`);

  try {
    const active = await verifyCloudflareApiToken(accountId);
    if (!active) {
      console.error(`❌ Cloudflare API token verification failed for account "${accountId}".`);
      return false;
    }
    console.log(`✅ API token active for account "${accountId}"`);

    const rules = buildDefaultR2CorsRules();
    console.log(`📋 Current CORS for bucket "${account.bucketName}" (${accountId}):`);
    const before = await getR2BucketCors(account.bucketName, accountId);
    console.log(JSON.stringify(before, null, 2));

    console.log(`🔄 Applying full CORS to bucket "${account.bucketName}"...`);
    const after = await putR2BucketCors(rules, account.bucketName, accountId);
    console.log(`✅ CORS updated for "${accountId}":`);
    console.log(JSON.stringify(after, null, 2));
    return true;
  } catch (err) {
    console.error(`❌ Failed to sync CORS for account "${accountId}":`, err);
    return false;
  }
}

async function main() {
  const accounts = getStorageAccountIds();
  console.log(`🚀 Starting CORS sync for ${accounts.length} R2 accounts: ${accounts.join(', ')}`);

  let successCount = 0;
  for (const accountId of accounts) {
    const ok = await syncAccountCors(accountId);
    if (ok) successCount += 1;
  }

  if (successCount < accounts.length) {
    console.error(`\n❌ CORS sync failed for ${accounts.length - successCount} account(s).`);
    process.exit(1);
  } else {
    console.log('\n✅ CORS sync completed successfully for all accounts.');
  }
}

main().catch((error) => {
  console.error('❌ R2 CORS sync failed:', error);
  process.exit(1);
});
