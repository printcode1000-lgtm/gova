import { existsSync } from "fs";
import dotenv from "dotenv";
import { runAllSchemaSyncs } from "../src/core/provisioning/schema-sync";

process.env.ASOL_PROVISIONING = "true";

if (existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config({ path: ".env" });

async function main() {
  const isCi = process.env.CI === "true" || process.env.VERCEL === "1";
  const removeExtraObjects = process.env.ASOL_SCHEMA_SYNC_EXACT === "true";
  const reports = await runAllSchemaSyncs({
    skipIfMissingCredentials: !isCi,
    removeExtraObjects,
  });

  for (const [label, report] of Object.entries(reports)) {
    if (report.skipped) {
      console.log(`${label} schema sync skipped: ${report.skipReason}`);
      continue;
    }

    console.log(`${label} schema synchronization completed`);
    console.log(`   SQLite version : ${report.sqliteSchemaVersion}`);
    console.log(`   Turso before   : ${report.tursoSchemaVersionBefore}`);
    console.log(`   Turso after    : ${report.tursoSchemaVersionAfter}`);
    console.log(`   Operations     : ${report.operations.length}`);
    console.log(`   Exact cleanup  : ${removeExtraObjects ? "enabled" : "disabled"}`);
    console.log(`   Columns added  : ${report.columnsAdded}`);
    console.log(`   Indexes added  : ${report.indexesAdded}`);
    console.log(`   Duration       : ${report.durationMs}ms`);

    if (report.warnings.length > 0) {
      console.log(`${label} warnings:`);
      for (const warning of report.warnings) {
        console.log(`   - ${warning}`);
      }
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Schema sync failed:", message);
  if (process.env.VERCEL === "1" && message.includes("not configured")) {
    console.error("");
    console.error("Add these to Vercel Project Settings Environment Variables:");
    console.error("  TURSO_DATABASE_URL, TURSO_AUTH_TOKEN");
    console.error("  TURSO_PROFILE_DATABASE_URL, TURSO_PROFILE_AUTH_TOKEN");
    console.error("  TURSO_PRODUCT_DATABASE_URL, TURSO_PRODUCT_AUTH_TOKEN");
    console.error(
      "  TURSO_ADVERTISEMENTS_DATABASE_URL, TURSO_ADVERTISEMENTS_AUTH_TOKEN",
    );
    console.error(
      "  MARKETPLACE_ORDERS_DATABASE_URL, MARKETPLACE_ORDERS_DATABASE_AUTH_TOKEN",
    );
    console.error("Or run locally: npm run db:push:vercel-env");
  }
  process.exit(1);
});
