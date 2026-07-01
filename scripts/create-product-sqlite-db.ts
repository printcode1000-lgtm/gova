import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  PRODUCT_SQLITE_DB_PATH,
  SQLITE_DIRECTORY,
} from "../src/core/database/environment";

fs.mkdirSync(SQLITE_DIRECTORY, { recursive: true });
if (!fs.existsSync(PRODUCT_SQLITE_DB_PATH)) {
  const sqlite = new Database(PRODUCT_SQLITE_DB_PATH);
  migrate(drizzle(sqlite), {
    migrationsFolder: path.join(
      process.cwd(),
      "src",
      "core",
      "database",
      "product",
      "migrations",
    ),
  });
  sqlite.close();
  console.log(`Created product database: ${PRODUCT_SQLITE_DB_PATH}`);
}
