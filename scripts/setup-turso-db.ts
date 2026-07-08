import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { runSchemaSync } from '../src/core/provisioning/schema-sync';

process.env.GOVA_PROVISIONING = 'true';

if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config({ path: '.env' });

runSchemaSync()
  .then((report) => {
    if (report.skipped) {
      console.log(`Schema sync skipped: ${report.skipReason}`);
      return;
    }
    console.log('Turso schema synchronized from SQLite (schema only, no data).');
    console.log(`Operations: ${report.operations.length}, Duration: ${report.durationMs}ms`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
