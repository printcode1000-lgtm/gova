import { nodeRequire } from '../node-require';
import "server-only";

import path from "path";

let migrationsRun = false;

export function ensureAdvertisementsDevMigrations(db: unknown): void {
  if (migrationsRun) return;
  const { migrate } = nodeRequire("drizzle-orm/better-sqlite3/migrator");
  migrate(db, {
    migrationsFolder: path.join(
      process.cwd(),
      'packages', 'data-core', 'src',
      "core",
      "database",
      "advertisements",
      "migrations",
    ),
  });
  migrationsRun = true;
}
