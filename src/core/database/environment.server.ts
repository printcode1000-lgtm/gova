import { existsSync, readdirSync } from 'fs';
import path from 'path';
import { PRIMARY_SQLITE_DB_PATH, SQLITE_DIRECTORY } from './environment';

/** Server-only SQLite path helpers (uses Node.js fs). */

export function getSqliteDirectory(): string {
  return SQLITE_DIRECTORY;
}

export function getSqliteDbPaths(): string[] {
  const dir = getSqliteDirectory();
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((name) => name.endsWith('.db'))
    .map((name) => path.join(dir, name))
    .sort();
}

export function getPrimarySqliteDbPath(): string {
  const paths = getSqliteDbPaths();
  if (paths.length === 0) {
    return PRIMARY_SQLITE_DB_PATH;
  }

  const preferred = paths.find((p) => p.endsWith('allusers.db'));
  return preferred ?? paths[0];
}
