import 'server-only';

import path from 'node:path';
import { isDevRuntime } from './environment';

let migrationsRun = false;

export function ensureProductDevMigrations(db: { db?: unknown } | unknown): void {
  if (!isDevRuntime() || migrationsRun) return;
  const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
  const database = db && typeof db === 'object' && 'db' in db ? (db as { db: unknown }).db : db;
  migrate(database, {
    migrationsFolder: path.join(process.cwd(), 'src', 'core', 'database', 'product', 'migrations'),
  });
  migrationsRun = true;
}
