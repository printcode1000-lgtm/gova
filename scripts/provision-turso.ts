import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { provisionTursoDatabase } from '../src/core/provisioning/turso-provisioner';
import { runSchemaSync } from '../src/core/provisioning/schema-sync';

process.env.GOVA_PROVISIONING = 'true';

if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config({ path: '.env' });
}

async function main() {
  if (!process.env.TURSO_API_TOKEN || !process.env.TURSO_ORGANIZATION) {
    console.error('❌ TURSO_API_TOKEN and TURSO_ORGANIZATION are required for Turso provisioning.');
    process.exit(1);
  }

  console.log('🚀 Provisioning Turso database (Platform API)...');
  const provision = await provisionTursoDatabase();
  console.log(`✅ Turso database ready: ${provision.databaseName} (${provision.databaseUrl})`);

  console.log('🔄 Running schema synchronization (SQLite → Turso, schema only)...');
  const report = await runSchemaSync({
    tursoUrl: provision.databaseUrl,
    tursoAuthToken: provision.authToken,
  });

  console.log('🎉 Turso provisioning and schema sync completed.');
  console.log(`   SQLite version : ${report.sqliteSchemaVersion}`);
  console.log(`   Turso after    : ${report.tursoSchemaVersionAfter}`);
  console.log(`   DDL operations : ${report.operations.length}`);
  console.log('   Data migration : skipped (schema-only sync)');
}

main().catch((error) => {
  console.error('❌ Turso provisioning failed:', error);
  process.exit(1);
});
