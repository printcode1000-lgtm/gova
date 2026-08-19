import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import {
  DATABASE_SHARDS,
  envPrefixForShard,
  sqliteFileNameForShard,
  type DatabaseShardName,
} from "../core/database/database-shards";
import { SQLITE_DIRECTORY } from "../core/database/environment";

function readEnvFiles(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
      if (match && values[match[1]] === undefined) values[match[1]] = match[2];
    }
  }
  return values;
}

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function main(): Promise<void> {
  const env = readEnvFiles();
  let failures = 0;

  for (const databaseName of Object.keys(DATABASE_SHARDS) as DatabaseShardName[]) {
    const prefix = envPrefixForShard(databaseName);
    const url = env[`${prefix}_DATABASE_URL`];
    const authToken = env[`${prefix}_DATABASE_AUTH_TOKEN`];
    if (!url || !authToken) throw new Error(`Missing env for ${databaseName}`);

    const sqlite = new Database(
      path.join(SQLITE_DIRECTORY, sqliteFileNameForShard(databaseName)),
      { readonly: true },
    );
    const client = createClient({ url, authToken });
    try {
      for (const table of DATABASE_SHARDS[databaseName]) {
        const localRow = sqlite
          .prepare(`SELECT COUNT(*) count FROM ${quoteIdent(table)}`)
          .get() as { count: number };
        const cloud = await client.execute(`SELECT COUNT(*) count FROM ${quoteIdent(table)}`);
        const cloudCount = Number(cloud.rows[0]?.count ?? 0);
        if (localRow.count !== cloudCount) {
          failures += 1;
          console.error(
            `${databaseName}.${table}: local=${localRow.count}, turso=${cloudCount}`,
          );
        } else {
          console.log(`${databaseName}.${table}: ${cloudCount}`);
        }
      }
    } finally {
      sqlite.close();
    }
  }

  if (failures > 0) {
    throw new Error(`Turso shard verification failed with ${failures} mismatch(es).`);
  }
  console.log("Turso shard verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
