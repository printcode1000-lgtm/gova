import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { PRIMARY_SQLITE_DB_PATH } from "@/modules/data-access/core/database/environment";

/**
 * Applies pending Drizzle migrations to the local users database.
 *
 * `db:ensure` only creates missing files, so an existing allusers.db otherwise
 * waits for the first dev-server request to migrate. Schema sync reads this
 * file as its schema source of truth, so it has to be current before syncing.
 */
const database = new Database(PRIMARY_SQLITE_DB_PATH);
migrate(drizzle(database), {
  migrationsFolder: path.join(
    process.cwd(),
    "src",
    "modules",
    "data-access",
    "core",
    "database",
    "migrations",
  ),
});
const tables = database
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all() as { name: string }[];
database.close();
console.log(`Users database migrated: ${PRIMARY_SQLITE_DB_PATH}`);
console.log(`Tables: ${tables.map((row) => row.name).join(", ")}`);
