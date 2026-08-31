import { nodeRequire } from '../core/node-require';
import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import {
  DATABASE_SHARD_NAMES,
  sqliteFileNameForShard,
} from "../core/database/database-shards";
import {
  PRIMARY_SQLITE_DB_PATH,
  ADVERTISEMENTS_SQLITE_DB_PATH,
  MARKETPLACE_ORDERS_SOURCE_SQLITE_DB_PATH,
  NOTIFICATIONS_SQLITE_DB_PATH,
  PRODUCT_SQLITE_DB_PATH,
  PROFILE_SOURCE_SQLITE_DB_PATH,
  SQLITE_DIRECTORY,
} from "../core/database/environment";
import { DATA_HEALTH_METADATA_STATEMENTS } from "../domains/data-health/db/metadata-schema";
import { ensureSystemLogsSchema } from "./ensure-system-logs-schema";

function ensureDatabase(dbPath: string, createScript: string): void {
  if (existsSync(dbPath)) {
    console.log(`✅ SQLite ready: ${path.relative(process.cwd(), dbPath)}`);
    return;
  }

  console.log(`📦 Creating ${path.basename(dbPath)}...`);
  execSync(`npx tsx ${createScript}`, { stdio: "inherit", cwd: process.cwd() });
}

if (!existsSync(SQLITE_DIRECTORY)) {
  console.log(`📁 Creating ${SQLITE_DIRECTORY}`);
}

ensureDatabase(PRIMARY_SQLITE_DB_PATH, "packages/data-core/src/tooling/create-sqlite-db.ts");
ensureDatabase(PROFILE_SOURCE_SQLITE_DB_PATH, "packages/data-core/src/tooling/create-profile-sqlite-db.ts");
ensureDatabase(PRODUCT_SQLITE_DB_PATH, "packages/data-core/src/tooling/create-product-sqlite-db.ts");
ensureDatabase(
  ADVERTISEMENTS_SQLITE_DB_PATH,
  "packages/data-core/src/tooling/create-advertisements-sqlite-db.ts",
);
ensureDatabase(
  MARKETPLACE_ORDERS_SOURCE_SQLITE_DB_PATH,
  "packages/data-core/src/tooling/create-marketplace-orders-sqlite-db.ts",
);
ensureDatabase(
  NOTIFICATIONS_SQLITE_DB_PATH,
  "packages/data-core/src/tooling/create-notifications-sqlite-db.ts",
);

const BetterSqlite = nodeRequire("better-sqlite3") as typeof import("better-sqlite3");
const ordersDatabase = new BetterSqlite(MARKETPLACE_ORDERS_SOURCE_SQLITE_DB_PATH);
try {
  for (const migration of [
    "packages/data-core/src/domains/marketplace-orders/db/migrations/0001_seller_order_fulfillment_snapshot.sql",
  ]) {
    try {
      ordersDatabase.exec(readFileSync(path.join(process.cwd(), migration), "utf8"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes("duplicate column")) {
        throw error;
      }
    }
  }
  console.log("Marketplace orders source schema ready for shard split");
} finally {
  ordersDatabase.close();
}

const profileDatabase = new BetterSqlite(PROFILE_SOURCE_SQLITE_DB_PATH);
try {
  for (const migration of [
    "packages/data-core/src/core/database/profile/migrations/0012_seller_discounts.sql",
    "packages/data-core/src/core/database/profile/migrations/0013_system_logs.sql",
    "packages/data-core/src/core/database/profile/migrations/0014_phone_e164_search_keys.sql",
    "packages/data-core/src/core/database/profile/migrations/0015_control_release_state.sql",
  ]) {
    profileDatabase.exec(readFileSync(path.join(process.cwd(), migration), "utf8"));
  }
  ensureSystemLogsSchema(profileDatabase);
  profileDatabase.exec(DATA_HEALTH_METADATA_STATEMENTS.join(";\n"));
  console.log("Profile source schema ready for shard split");
} finally {
  profileDatabase.close();
}

execSync("npx tsx packages/data-core/src/tooling/split-sqlite-shards.ts", { stdio: "inherit", cwd: process.cwd() });

for (const databaseName of DATABASE_SHARD_NAMES) {
  const shardPath = path.join(SQLITE_DIRECTORY, sqliteFileNameForShard(databaseName));
  if (!existsSync(shardPath)) {
    throw new Error(`SQLite shard was not created: ${path.relative(process.cwd(), shardPath)}`);
  }
}

console.log(`SQLite shards ready: ${DATABASE_SHARD_NAMES.length} databases`);
