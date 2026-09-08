import { createClient } from "@libsql/client";
import {
  DATABASE_SHARD_NAMES,
  envPrefixForShard,
  type DatabaseShardName,
} from "../core/database/database-shards";
import { readDesiredSchema } from "../provisioning/desired-schema/registry";
import { readTursoSchema } from "../provisioning/core/turso-schema-reader";
import { diffSchemas } from "../provisioning/core/schema-diff";
import { ignoredExtraTablesFor } from "../provisioning/core/schema-sync";
import { readEnvFiles } from "@asol/env-core/files";

/**
 * Read-only check that every shard database matches the schema this repository
 * says it should have.
 *
 * It used to compare row counts against a local shard file, which answered a
 * question nobody has: whether a developer's laptop happened to hold the same
 * number of rows as production. A shard is healthy when its *schema* is the one
 * the code expects; the rows are the users' and are not this command's business.
 *
 * Nothing here writes. A missing object is reported, never created.
 */
async function main(): Promise<void> {
  const env = readEnvFiles();
  let failures = 0;

  for (const databaseName of DATABASE_SHARD_NAMES as readonly DatabaseShardName[]) {
    const prefix = envPrefixForShard(databaseName);
    const url = env[`${prefix}_DATABASE_URL`];
    const authToken = env[`${prefix}_DATABASE_AUTH_TOKEN`];
    if (!url || !authToken) {
      throw new Error(
        `Missing ${prefix}_DATABASE_URL / ${prefix}_DATABASE_AUTH_TOKEN for ${databaseName}. ` +
          "Missing credentials are a configuration failure, never a reason to check less.",
      );
    }

    const desired = readDesiredSchema(databaseName);
    const client = createClient({ url, authToken });
    const actual = await readTursoSchema(client as Parameters<typeof readTursoSchema>[0]);
    const { operations, migrationsRequired } = diffSchemas(desired, actual, {
      ignoredExtraTables: ignoredExtraTablesFor(databaseName),
    });

    if (operations.length === 0 && migrationsRequired.length === 0) {
      console.log(`${databaseName}: schema matches (${Object.keys(desired.tables).length} tables)`);
      continue;
    }

    failures += 1;
    for (const operation of operations) {
      console.error(`${databaseName}: missing — ${operation.description}`);
    }
    for (const requirement of migrationsRequired) {
      console.error(`${databaseName}: migration required — ${requirement.description}`);
    }
  }

  if (failures > 0) {
    throw new Error(`Turso shard schema verification failed for ${failures} database(s).`);
  }
  console.log("Turso shard schema verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
