import { existsSync } from "node:fs";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";
import { loadCredentialsFor } from "../provisioning/core/schema-credentials";

/**
 * Marks pre-classification server-side system log rows as cloud-origin.
 *
 * `system_logs` gained `origin` and `trust_level` after rows already existed, so
 * every historical row carries `trust_level = 'legacy'` and no origin. Rows that
 * were written by a server or an API route are cloud-origin; the log viewer
 * filters on that, and without the backfill they read as client reports.
 *
 * This ran inside `SystemLogsRepository.ensureSchema()` — on every write, in
 * every runtime, forever — which is a row rewrite hidden in a read path. It is
 * an explicit command now: idempotent (a row it has already converted no longer
 * matches), scoped to one table, and run when someone decides to run it.
 *
 * Schema is not this command's business: the columns come from the `system-ops`
 * desired manifest.
 */
export const SYSTEM_LOG_ORIGIN_BACKFILL_SQL = `
  UPDATE system_logs
  SET origin = 'cloud'
  WHERE trust_level = 'legacy'
    AND origin != 'cloud'
    AND (platform = 'server' OR source IN ('server', 'api'))
`;

export async function migrateSystemLogOrigin(): Promise<number> {
  const credentials = loadCredentialsFor("system-ops");
  if (!credentials) {
    throw new Error(
      "SYSTEM_OPS_DATABASE_URL / SYSTEM_OPS_DATABASE_AUTH_TOKEN are required.",
    );
  }
  const client = createClient(credentials);
  try {
    const result = await client.execute(SYSTEM_LOG_ORIGIN_BACKFILL_SQL);
    return Number(result.rowsAffected ?? 0);
  } finally {
    client.close();
  }
}

if (process.argv[1]?.includes("migrate-system-log-origin")) {
  if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
  migrateSystemLogOrigin()
    .then((rows) => console.log(`system_logs origin backfill: ${rows} row(s) updated`))
    .catch((error) => {
      console.error("system_logs origin backfill failed:", error);
      process.exit(1);
    });
}
