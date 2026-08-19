import { existsSync, mkdirSync, readdirSync, readFileSync } from "fs";
import path from "path";
import Database from "better-sqlite3";

import { MARKETPLACE_ORDERS_SOURCE_SQLITE_DB_PATH } from "../core/database/environment";

const migrationsDir = path.join(
  process.cwd(),
  'packages', 'data-core', 'src',
  "domains",
  "marketplace-orders",
  "db",
  "migrations",
);

const dbDir = path.dirname(MARKETPLACE_ORDERS_SOURCE_SQLITE_DB_PATH);
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

const db = new Database(MARKETPLACE_ORDERS_SOURCE_SQLITE_DB_PATH);
try {
  db.pragma("foreign_keys = ON");
  for (const file of readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    db.exec(readFileSync(path.join(migrationsDir, file), "utf8"));
  }
  console.log("Applied marketplace orders migrations to local SQLite.");
} finally {
  db.close();
}
