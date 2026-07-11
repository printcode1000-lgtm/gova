import { existsSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import Database from "better-sqlite3";

import { MARKETPLACE_ORDERS_SQLITE_DB_PATH } from "../src/core/database/environment";

const migrationPath = path.join(
  process.cwd(),
  "src",
  "modules",
  "marketplace-orders",
  "db",
  "migrations",
  "0000_marketplace_orders.sql",
);

const dbDir = path.dirname(MARKETPLACE_ORDERS_SQLITE_DB_PATH);
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

const db = new Database(MARKETPLACE_ORDERS_SQLITE_DB_PATH);
try {
  db.pragma("foreign_keys = ON");
  db.exec(readFileSync(migrationPath, "utf8"));
  console.log("Applied marketplace orders migration to local SQLite.");
} finally {
  db.close();
}
