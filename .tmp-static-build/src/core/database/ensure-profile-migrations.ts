import 'server-only';

import path from 'path';
import { isDevRuntime } from './environment';

let migrationsRun = false;

/**
 * Applies Drizzle migrations to local profile SQLite on first server request in development.
 */
export function ensureProfileDevMigrations(db: { db?: unknown } | unknown): void {
  if (!isDevRuntime() || migrationsRun) return;

  try {
    const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
    const database = db && typeof db === 'object' && 'db' in (db as object) ? (db as { db: unknown }).db : db;
    const migrationsFolder = path.join(process.cwd(), 'src', 'core', 'database', 'profile', 'migrations');

    migrate(database, { migrationsFolder });
    migrationsRun = true;
    console.log('✅ Local profile SQLite Drizzle migrations applied successfully!');
  } catch (error) {
    console.error('❌ Failed to run local profile SQLite migrations:', error);
  }
}
