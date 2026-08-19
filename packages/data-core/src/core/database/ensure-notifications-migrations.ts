import { nodeRequire } from '../node-require';
import 'server-only';

import path from 'path';
import { isDevRuntime } from './environment';

let migrationsRun = false;

/**
 * Applies Drizzle migrations to the local notifications SQLite database on the
 * first server request in development.
 */
export function ensureNotificationsDevMigrations(db: { db?: unknown } | unknown): void {
  if (!isDevRuntime() || migrationsRun) return;

  try {
    const { migrate } = nodeRequire('drizzle-orm/better-sqlite3/migrator');
    const database =
      db && typeof db === 'object' && 'db' in (db as object) ? (db as { db: unknown }).db : db;
    const migrationsFolder = path.join(
      process.cwd(),
      'packages', 'data-core', 'src',
      'core',
      'database',
      'notifications',
      'migrations',
    );

    migrate(database, { migrationsFolder });
    migrationsRun = true;
  } catch (error) {
    console.error('❌ Failed to run local notifications SQLite migrations:', error);
  }
}
