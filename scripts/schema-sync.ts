import { existsSync } from "fs";
import dotenv from "dotenv";
import { runAllSchemaSyncs } from "@asol/data-core/provisioning";

process.env.ASOL_PROVISIONING = "true";

if (existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}

/**
 * Compares the repository's desired schema with every Turso database, and — only
 * when asked — applies the additive DDL that closes the gap.
 *
 * `--verify` is the read-only mode a generic build and a developer machine run:
 * it sends no DDL and reports what is missing. Applying belongs to the release
 * preflight, which is a step someone runs deliberately. Splitting the two is
 * what stops `npm run build` from being able to change a production database.
 *
 * There is no local database to fall back on. Missing credentials skip a
 * database on a developer machine and fail the run in CI or a release; they
 * never turn into a comparison against something local.
 */
function verifyOnlyRequested(argv: readonly string[] = process.argv): boolean {
  return argv.includes("--verify");
}

function schemaSyncRequiresCredentials(): boolean {
  return (
    process.env.CI === "true" ||
    process.env.VERCEL === "1" ||
    process.env.ASOL_SCHEMA_SYNC_REQUIRED === "true"
  );
}

async function main() {
  const requireCredentials = schemaSyncRequiresCredentials();
  const verifyOnly = verifyOnlyRequested();
  const removeExtraObjects = !verifyOnly && process.env.ASOL_SCHEMA_SYNC_EXACT === "true";
  const reports = await runAllSchemaSyncs({
    skipIfMissingCredentials: !requireCredentials,
    removeExtraObjects,
    verifyOnly,
  });

  const skipped: Array<{ label: string; reason: string }> = [];

  for (const [label, report] of Object.entries(reports)) {
    if (report.skipped) {
      skipped.push({ label, reason: report.skipReason ?? "unknown" });
      console.log(`${label} schema ${verifyOnly ? "verification" : "sync"} skipped: ${report.skipReason}`);
      continue;
    }

    console.log(`${label} schema ${verifyOnly ? "verification" : "synchronization"} completed`);
    console.log(`   Desired version : ${report.desiredSchemaVersion}`);
    console.log(`   Turso before    : ${report.tursoSchemaVersionBefore}`);
    console.log(`   Turso after     : ${report.tursoSchemaVersionAfter}`);
    console.log(`   Operations      : ${report.operations.length}`);
    console.log(`   Mode            : ${verifyOnly ? "read-only verification" : "apply"}`);
    console.log(`   Exact cleanup   : ${removeExtraObjects ? "enabled" : "disabled"}`);
    console.log(`   Columns added   : ${report.columnsAdded}`);
    console.log(`   Indexes added   : ${report.indexesAdded}`);
    console.log(`   Duration        : ${report.durationMs}ms`);

    if (report.warnings.length > 0) {
      console.log(`${label} warnings:`);
      for (const warning of report.warnings) {
        console.log(`   - ${warning}`);
      }
    }
  }

  if (requireCredentials && skipped.length > 0) {
    throw new Error(
      `Schema ${verifyOnly ? "verification" : "sync"} refused to finish with ${skipped.length} skipped database(s): ` +
        skipped.map((entry) => `${entry.label} (${entry.reason})`).join("; "),
    );
  }
}

export const __testables = {
  schemaSyncRequiresCredentials,
  verifyOnlyRequested,
};

const invokedDirectly = process.argv[1]?.includes("schema-sync");
if (invokedDirectly) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Schema sync failed:", message);
    if (process.env.VERCEL === "1" && message.includes("not configured")) {
      console.error("");
      console.error("Add these to Vercel Project Settings Environment Variables:");
      console.error("  TURSO_DATABASE_URL, TURSO_AUTH_TOKEN");
      console.error("  TURSO_PRODUCT_DATABASE_URL, TURSO_PRODUCT_AUTH_TOKEN");
      console.error(
        "  TURSO_ADVERTISEMENTS_DATABASE_URL, TURSO_ADVERTISEMENTS_AUTH_TOKEN",
      );
      console.error(
        "  TURSO_NOTIFICATIONS_DATABASE_URL, TURSO_NOTIFICATIONS_AUTH_TOKEN",
      );
      console.error("  plus every *_DATABASE_URL / *_DATABASE_AUTH_TOKEN shard key");
      console.error("Or run locally: npm run db:push:vercel-env");
    }
    process.exit(1);
  });
}
