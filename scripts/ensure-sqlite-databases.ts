import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import {
  DATABASE_SHARD_NAMES,
  sqliteFileNameForShard,
} from "../src/core/database/database-shards";
import {
  PRIMARY_SQLITE_DB_PATH,
  ADVERTISEMENTS_SQLITE_DB_PATH,
  MARKETPLACE_ORDERS_SOURCE_SQLITE_DB_PATH,
  PRODUCT_SQLITE_DB_PATH,
  PROFILE_SOURCE_SQLITE_DB_PATH,
  SQLITE_DIRECTORY,
} from "../src/core/database/environment";
import { DATA_HEALTH_METADATA_STATEMENTS } from "../src/modules/data-health/db/metadata-schema";

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

ensureDatabase(PRIMARY_SQLITE_DB_PATH, "scripts/create-sqlite-db.ts");
ensureDatabase(PROFILE_SOURCE_SQLITE_DB_PATH, "scripts/create-profile-sqlite-db.ts");
ensureDatabase(PRODUCT_SQLITE_DB_PATH, "scripts/create-product-sqlite-db.ts");
ensureDatabase(
  ADVERTISEMENTS_SQLITE_DB_PATH,
  "scripts/create-advertisements-sqlite-db.ts",
);
ensureDatabase(
  MARKETPLACE_ORDERS_SOURCE_SQLITE_DB_PATH,
  "scripts/create-marketplace-orders-sqlite-db.ts",
);

const BetterSqlite = require("better-sqlite3") as typeof import("better-sqlite3");
const profileDatabase = new BetterSqlite(PROFILE_SOURCE_SQLITE_DB_PATH);
try {
  for (const migration of [
    "src/core/database/profile/migrations/0012_seller_discounts.sql",
    "src/core/database/profile/migrations/0013_system_logs.sql",
  ]) {
    profileDatabase.exec(readFileSync(path.join(process.cwd(), migration), "utf8"));
  }
  profileDatabase.exec(DATA_HEALTH_METADATA_STATEMENTS.join(";\n"));
  console.log("Profile source schema ready for shard split");
} finally {
  profileDatabase.close();
}

execSync("npx tsx scripts/split-sqlite-shards.ts", { stdio: "inherit", cwd: process.cwd() });

for (const databaseName of DATABASE_SHARD_NAMES) {
  const shardPath = path.join(SQLITE_DIRECTORY, sqliteFileNameForShard(databaseName));
  if (!existsSync(shardPath)) {
    throw new Error(`SQLite shard was not created: ${path.relative(process.cwd(), shardPath)}`);
  }
}

console.log(`SQLite shards ready: ${DATABASE_SHARD_NAMES.length} databases`);
