import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { runSchemaSync } from '../src/core/provisioning/schema-sync';

process.env.GOVA_PROVISIONING = 'true';

if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config({ path: '.env' });
}

async function main() {
  const isCi = process.env.CI === 'true' || process.env.VERCEL === '1';
  const report = await runSchemaSync({ skipIfMissingCredentials: !isCi });

  if (report.skipped) {
    console.log(`⏭️  Schema sync skipped: ${report.skipReason}`);
    process.exit(0);
  }

  console.log('✅ Schema synchronization completed');
  console.log(`   SQLite version : ${report.sqliteSchemaVersion}`);
  console.log(`   Turso before   : ${report.tursoSchemaVersionBefore}`);
  console.log(`   Turso after    : ${report.tursoSchemaVersionAfter}`);
  console.log(`   Operations     : ${report.operations.length}`);
  console.log(`   Columns added  : ${report.columnsAdded}`);
  console.log(`   Indexes added  : ${report.indexesAdded}`);
  console.log(`   Duration       : ${report.durationMs}ms`);

  if (report.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    for (const warning of report.warnings) {
      console.log(`   - ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error('❌ Schema sync failed:', error);
  process.exit(1);
});
