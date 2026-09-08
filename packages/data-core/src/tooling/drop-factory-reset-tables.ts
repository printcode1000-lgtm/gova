import { existsSync } from "node:fs";

import { createClient } from "@libsql/client";
import dotenv from "dotenv";

import { loadTursoCredentialsFromEnv } from "../provisioning/core/turso-provisioner";

process.env.ASOL_PROVISIONING = "true";
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

/**
 * Dropping a cloud table is destructive and stays behind an explicit flag.
 * There is only one copy of these rows now, so `--cloud` is not a second target
 * — it is the confirmation that the caller means it.
 */
async function main() {
  if (!process.argv.includes("--cloud")) {
    console.log(
      "Refusing to drop anything without --cloud. This removes tables from the live users database.",
    );
    return;
  }
  await dropCloud();
}

main().catch((error) => {
  console.error("Factory reset table drop failed:", error);
  process.exit(1);
});
