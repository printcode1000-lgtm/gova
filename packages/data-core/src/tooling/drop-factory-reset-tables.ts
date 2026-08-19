import { existsSync } from "node:fs";

import { createClient } from "@libsql/client";
import Database from "better-sqlite3";
import dotenv from "dotenv";

import { PRIMARY_SQLITE_DB_PATH } from "../core/database/environment";
import { loadTursoCredentialsFromEnv } from "../provisioning/core/turso-provisioner";

process.env.ASOL_PROVISIONING = "true";
if (existsSync(".env")) dotenv.config({ path: ".env" });
if (existsSync(".env.local")) dotenv.config({ path: ".env.local" });

/**
 * Leftover tables from the removed data-health factory reset feature.
 * They live in the users database and are no longer created or read.
 */
const DROP_TABLES = [
  "data_health_factory_reset_audit",
  "data_health_factory_reset_locks",
  "data_health_factory_reset_plans",
];

function dropLocal(): void {
  if (!existsSync(PRIMARY_SQLITE_DB_PATH)) {
    console.log(`SQLite skipped: ${PRIMARY_SQLITE_DB_PATH} does not exist`);
    return;
  }
  const db = new Database(PRIMARY_SQLITE_DB_PATH);
  try {
    for (const table of DROP_TABLES) db.exec(`DROP TABLE IF EXISTS ${table}`);
  } finally {
    db.close();
  }
  console.log(`SQLite factory reset tables dropped: ${PRIMARY_SQLITE_DB_PATH}`);
}

async function dropCloud(): Promise<void> {
  const credentials = loadTursoCredentialsFromEnv();
  if (!credentials) {
    console.log("Turso skipped: users credentials are not configured");
    return;
  }
  const client = createClient(credentials);
  try {
    for (const table of DROP_TABLES) {
      await client.execute(`DROP TABLE IF EXISTS ${table}`);
    }
  } finally {
    client.close();
  }
  console.log("Turso factory reset tables dropped");
}

async function main() {
  dropLocal();
  if (process.argv.includes("--cloud")) await dropCloud();
}

main().catch((error) => {
  console.error("Factory reset table drop failed:", error);
  process.exit(1);
});
