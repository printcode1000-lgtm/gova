import { existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import {
  PRIMARY_SQLITE_DB_PATH,
  PRODUCT_SQLITE_DB_PATH,
  PROFILE_SQLITE_DB_PATH,
  SQLITE_DIRECTORY,
} from "../src/core/database/environment";

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
