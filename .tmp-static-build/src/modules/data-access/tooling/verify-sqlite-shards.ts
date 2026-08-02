import path from "node:path";
import Database from "better-sqlite3";
import {
  MARKETPLACE_ORDER_SHARDS,
  PROFILE_SHARDS,
  sqliteFileNameForShard,
  type DatabaseShardName,
} from "@/modules/data-access/core/database/database-shards";
import { SQLITE_DIRECTORY } from "@/modules/data-access/core/database/environment";

type ShardMap = Record<string, readonly string[]>;

const SOURCES: Array<{ sourceFile: string; shards: ShardMap }> = [
  { sourceFile: "profile.db", shards: PROFILE_SHARDS },
  { sourceFile: "marketplace-orders.db", shards: MARKETPLACE_ORDER_SHARDS },
];

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function countRows(db: Database.Database, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) count FROM ${quoteIdent(table)}`).get() as {
    count: number;
  };
  return row.count;
}

let failures = 0;

for (const source of SOURCES) {
  const sourceDb = new Database(path.join(SQLITE_DIRECTORY, source.sourceFile), { readonly: true });
  try {
    for (const [databaseName, tables] of Object.entries(source.shards)) {
      const shardDb = new Database(
        path.join(SQLITE_DIRECTORY, sqliteFileNameForShard(databaseName as DatabaseShardName)),
        { readonly: true },
      );
      try {
        for (const table of tables) {
          const sourceCount = countRows(sourceDb, table);
          const shardCount = countRows(shardDb, table);
          if (sourceCount !== shardCount) {
            failures += 1;
            console.error(
              `${databaseName}.${table}: expected ${sourceCount}, found ${shardCount}`,
            );
          } else {
            console.log(`${databaseName}.${table}: ${shardCount}`);
          }
        }
      } finally {
        shardDb.close();
      }
    }
  } finally {
    sourceDb.close();
  }
}

if (failures > 0) {
  throw new Error(`SQLite shard verification failed with ${failures} mismatch(es).`);
}

console.log("SQLite shard verification passed.");
