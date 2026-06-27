import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { PRIMARY_SQLITE_DB_PATH, SQLITE_DIRECTORY } from '../src/core/database/environment';

const DB_DIR = SQLITE_DIRECTORY;
const DB_PATH = PRIMARY_SQLITE_DB_PATH;
const MIGRATIONS_FOLDER = path.join(process.cwd(), 'src', 'core', 'database', 'migrations');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`Created directory: ${DB_DIR}`);
}

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log(`Deleted existing database: ${DB_PATH}`);
}

const db = new Database(DB_PATH);
console.log(`Created database: ${DB_PATH}`);

const drizzleDb = drizzle(db);
migrate(drizzleDb, { migrationsFolder: MIGRATIONS_FOLDER });

db.close();
console.log('Applied Drizzle migrations to local SQLite (schema source of truth).');
