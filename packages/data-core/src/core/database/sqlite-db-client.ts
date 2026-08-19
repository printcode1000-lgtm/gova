import { nodeRequire } from '../node-require';
import { ensureDevMigrations } from './ensure-migrations';
import 'server-only';

import { isDevelopment } from '@/core/config';
import { createDrizzleDevLogger } from '../../ports/telemetry';
import { AbstractDatabaseClient } from './abstract-database-client';
import { PRIMARY_SQLITE_DB_PATH } from './environment';

export class SQLiteDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;

    const { drizzle } = nodeRequire('drizzle-orm/better-sqlite3');
    const Database = nodeRequire('better-sqlite3');
    const sqlite = new Database(PRIMARY_SQLITE_DB_PATH);
    this._db = drizzle(sqlite, isDevelopment ? { logger: createDrizzleDevLogger() } : undefined);

    ensureDevMigrations(this._db);

    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const Database = nodeRequire('better-sqlite3');
    const db = new Database(PRIMARY_SQLITE_DB_PATH);

    try {
      const stmt = db.prepare(sql);
      if (
        sql.trim().toUpperCase().startsWith('SELECT') ||
        /\bRETURNING\b/i.test(sql)
      ) {
        return stmt.all(...params);
      }

      const info = stmt.run(...params);
      return [info];
    } finally {
      db.close();
    }
  }
}
