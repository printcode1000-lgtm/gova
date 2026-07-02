import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  ADVERTISEMENTS_SQLITE_DB_PATH,
  SQLITE_DIRECTORY,
} from "../src/core/database/environment";

const migrationsFolder = path.join(
  process.cwd(),
  "src",
  "core",
  "database",
  "advertisements",
  "migrations",
);

fs.mkdirSync(SQLITE_DIRECTORY, { recursive: true });
const sqlite = new Database(ADVERTISEMENTS_SQLITE_DB_PATH);
migrate(drizzle(sqlite), { migrationsFolder });
sqlite.close();
console.log(`Advertisements database ready: ${ADVERTISEMENTS_SQLITE_DB_PATH}`);
