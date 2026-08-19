import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  NOTIFICATIONS_SQLITE_DB_PATH,
  SQLITE_DIRECTORY,
} from "../core/database/environment";

const migrationsFolder = path.join(
  process.cwd(),
  'packages', 'data-core', 'src',
  "core",
  "database",
  "notifications",
  "migrations",
);

fs.mkdirSync(SQLITE_DIRECTORY, { recursive: true });
const sqlite = new Database(NOTIFICATIONS_SQLITE_DB_PATH);
migrate(drizzle(sqlite), { migrationsFolder });
sqlite.close();
console.log(`Notifications database ready: ${NOTIFICATIONS_SQLITE_DB_PATH}`);
