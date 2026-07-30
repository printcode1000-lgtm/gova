import { existsSync } from "fs";
import dotenv from "dotenv";
import {
  provisionTursoAdvertisementsDatabase,
  provisionTursoDatabase,
  provisionTursoProductDatabase,
} from "../src/core/provisioning/turso-provisioner";
import { runAllSchemaSyncs } from "../src/core/provisioning/schema-sync";
import { provisionDatabaseShards } from "./provision-database-shards";

process.env.ASOL_PROVISIONING = "true";

if (existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config({ path: ".env" });

async function main() {
  if (!process.env.TURSO_API_TOKEN || !process.env.TURSO_ORGANIZATION) {
    console.error("TURSO_API_TOKEN and TURSO_ORGANIZATION are required for Turso provisioning.");
    process.exit(1);
  }

  console.log("Provisioning Turso users database...");
  const usersProvision = await provisionTursoDatabase();
  console.log(`Turso users DB ready: ${usersProvision.databaseName} (${usersProvision.databaseUrl})`);

  console.log("Provisioning Turso product database...");
  const productProvision = await provisionTursoProductDatabase();
  console.log(`Turso product DB ready: ${productProvision.databaseName} (${productProvision.databaseUrl})`);

  console.log("Provisioning Turso advertisements database...");
  const advertisementsProvision = await provisionTursoAdvertisementsDatabase();
  console.log(
    `Turso advertisements DB ready: ${advertisementsProvision.databaseName} (${advertisementsProvision.databaseUrl})`,
  );

  console.log("Provisioning Turso profile/orders shards...");
  await provisionDatabaseShards();

  console.log("Running schema synchronization (SQLite to Turso, schema only)...");
  const reports = await runAllSchemaSyncs({ removeExtraObjects: true });

  console.log("Turso provisioning and schema sync completed.");
  for (const [label, report] of Object.entries(reports)) {
    console.log(`   [${label}] SQLite version : ${report.sqliteSchemaVersion}`);
    console.log(`   [${label}] Turso after    : ${report.tursoSchemaVersionAfter}`);
    console.log(`   [${label}] DDL operations : ${report.operations.length}`);
  }
  console.log("   Data migration : skipped (schema-only sync)");
}

main().catch((error) => {
  console.error("Turso provisioning failed:", error);
  process.exit(1);
});
