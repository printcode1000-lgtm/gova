import { existsSync } from 'fs';
import dotenv from 'dotenv';
import {
  provisionTursoDatabase,
  provisionTursoProfileDatabase,
} from '../src/core/provisioning/turso-provisioner';
import { runAllSchemaSyncs } from '../src/core/provisioning/schema-sync';

process.env.GOVA_PROVISIONING = 'true';

if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config({ path: '.env' });

async function main() {
  if (!process.env.TURSO_API_TOKEN || !process.env.TURSO_ORGANIZATION) {
    console.error('❌ TURSO_API_TOKEN and TURSO_ORGANIZATION are required for Turso provisioning.');
    process.exit(1);
  }

  console.log('🚀 Provisioning Turso users database (Platform API)...');
  const usersProvision = await provisionTursoDatabase();
  console.log(`✅ Turso users DB ready: ${usersProvision.databaseName} (${usersProvision.databaseUrl})`);

  console.log('🚀 Provisioning Turso profile database (Platform API)...');
  const profileProvision = await provisionTursoProfileDatabase();
  console.log(
    `✅ Turso profile DB ready: ${profileProvision.databaseName} (${profileProvision.databaseUrl})`
  );

  console.log('🔄 Running schema synchronization (SQLite → Turso per database, schema only)...');
  const reports = await runAllSchemaSyncs();

  console.log('🎉 Turso provisioning and schema sync completed.');
  for (const [label, report] of Object.entries(reports)) {
    console.log(`   [${label}] SQLite version : ${report.sqliteSchemaVersion}`);
    console.log(`   [${label}] Turso after    : ${report.tursoSchemaVersionAfter}`);
    console.log(`   [${label}] DDL operations : ${report.operations.length}`);
  }
  console.log('   Data migration : skipped (schema-only sync)');
}

main().catch((error) => {
  console.error('❌ Turso provisioning failed:', error);
  process.exit(1);
});
