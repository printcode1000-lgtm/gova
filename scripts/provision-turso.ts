import { existsSync } from "fs";
import dotenv from "dotenv";
import {
  provisionTursoDatabase,
  provisionTursoMarketplaceOrdersDatabase,
  provisionTursoProfileDatabase,
} from "../src/core/provisioning/turso-provisioner";
import { runAllSchemaSyncs } from "../src/core/provisioning/schema-sync";

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

  console.log("Provisioning Turso profile database...");
  const profileProvision = await provisionTursoProfileDatabase();
  console.log(`Turso profile DB ready: ${profileProvision.databaseName} (${profileProvision.databaseUrl})`);

  console.log("Provisioning Turso marketplace orders database...");
  const marketplaceOrdersProvision = await provisionTursoMarketplaceOrdersDatabase();
  console.log(
    `Turso marketplace orders DB ready: ${marketplaceOrdersProvision.databaseName} (${marketplaceOrdersProvision.databaseUrl})`,
  );

  console.log("Running schema synchronization (SQLite to Turso, schema only)...");
  const reports = await runAllSchemaSyncs();

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
