import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { PROFILE_SOURCE_SQLITE_DB_PATH, SQLITE_DIRECTORY } from '@/modules/data-access/core/database/environment';

const MIGRATIONS_FOLDER = path.join(process.cwd(), 'src', 'modules', 'data-access', 'core', 'database', 'profile', 'migrations');

if (!fs.existsSync(SQLITE_DIRECTORY)) {
  fs.mkdirSync(SQLITE_DIRECTORY, { recursive: true });
  console.log(`Created directory: ${SQLITE_DIRECTORY}`);
}

if (!fs.existsSync(PROFILE_SOURCE_SQLITE_DB_PATH)) {
  const db = new Database(PROFILE_SOURCE_SQLITE_DB_PATH);
  console.log(`Created database: ${PROFILE_SOURCE_SQLITE_DB_PATH}`);
  const drizzleDb = drizzle(db);
  migrate(drizzleDb, { migrationsFolder: MIGRATIONS_FOLDER });
  db.close();
  console.log('Applied Drizzle migrations to profile SQLite (schema source of truth).');
} else {
  console.log(`Profile database already exists: ${PROFILE_SOURCE_SQLITE_DB_PATH}`);
}
