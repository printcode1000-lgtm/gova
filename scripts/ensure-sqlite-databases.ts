import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import {
  PRIMARY_SQLITE_DB_PATH,
  ADVERTISEMENTS_SQLITE_DB_PATH,
  MARKETPLACE_ORDERS_SQLITE_DB_PATH,
  PRODUCT_SQLITE_DB_PATH,
  PROFILE_SQLITE_DB_PATH,
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
ensureDatabase(PROFILE_SQLITE_DB_PATH, "scripts/create-profile-sqlite-db.ts");
ensureDatabase(PRODUCT_SQLITE_DB_PATH, "scripts/create-product-sqlite-db.ts");
ensureDatabase(
  ADVERTISEMENTS_SQLITE_DB_PATH,
  "scripts/create-advertisements-sqlite-db.ts",
);
ensureDatabase(
  MARKETPLACE_ORDERS_SQLITE_DB_PATH,
  "scripts/create-marketplace-orders-sqlite-db.ts",
);

const BetterSqlite = require("better-sqlite3") as typeof import("better-sqlite3");
const profileDatabase = new BetterSqlite(PROFILE_SQLITE_DB_PATH);
try {
  for (const migration of [
    "src/core/database/profile/migrations/0012_seller_discounts.sql",
    "src/core/database/profile/migrations/0013_system_logs.sql",
  ]) {
    profileDatabase.exec(readFileSync(path.join(process.cwd(), migration), "utf8"));
  }
  profileDatabase.exec(DATA_HEALTH_METADATA_STATEMENTS.join(";\n"));
  console.log("✅ Profile runtime indexes and data health schema ready in profile.db");
} finally {
  profileDatabase.close();
}
