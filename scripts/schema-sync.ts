import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { runAllSchemaSyncs } from '../src/core/provisioning/schema-sync';

process.env.GOVA_PROVISIONING = 'true';

if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config({ path: '.env' });

async function main() {
  const isCi = process.env.CI === 'true' || process.env.VERCEL === '1';
  const reports = await runAllSchemaSyncs({ skipIfMissingCredentials: !isCi });

  for (const [label, report] of Object.entries(reports)) {
    if (report.skipped) {
      console.log(`⏭️  ${label} schema sync skipped: ${report.skipReason}`);
      continue;
    }

    console.log(`✅ ${label} schema synchronization completed`);
    console.log(`   SQLite version : ${report.sqliteSchemaVersion}`);
    console.log(`   Turso before   : ${report.tursoSchemaVersionBefore}`);
    console.log(`   Turso after    : ${report.tursoSchemaVersionAfter}`);
    console.log(`   Operations     : ${report.operations.length}`);
    console.log(`   Columns added  : ${report.columnsAdded}`);
    console.log(`   Indexes added  : ${report.indexesAdded}`);
    console.log(`   Duration       : ${report.durationMs}ms`);

    if (report.warnings.length > 0) {
      console.log(`⚠️  ${label} warnings:`);
      for (const warning of report.warnings) {
        console.log(`   - ${warning}`);
      }
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('❌ Schema sync failed:', message);
  if (process.env.VERCEL === '1' && message.includes('not configured')) {
    console.error('');
    console.error('Add these to Vercel → Project → Settings → Environment Variables:');
    console.error('  TURSO_DATABASE_URL, TURSO_AUTH_TOKEN');
    console.error('  TURSO_PROFILE_DATABASE_URL, TURSO_PROFILE_AUTH_TOKEN');
    console.error('Or run locally: npm run db:push:vercel-env');
  }
  process.exit(1);
});
