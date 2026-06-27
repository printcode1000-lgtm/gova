import 'server-only';

import { isDevelopment } from '@/core/config';
import { createDrizzleDevLogger } from '@/core/monitor/drizzle-dev-logger';
import { PROFILE_SQLITE_DB_PATH } from './environment';
import { AbstractDatabaseClient } from './abstract-database-client';

export class ProfileSQLiteDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;

    const { drizzle } = require('drizzle-orm/better-sqlite3');
    const Database = require('better-sqlite3');
    const sqlite = new Database(PROFILE_SQLITE_DB_PATH);
    this._db = drizzle(sqlite, isDevelopment ? { logger: createDrizzleDevLogger() } : undefined);

    const { ensureProfileDevMigrations } = require('./ensure-profile-migrations');
    ensureProfileDevMigrations(this._db);

    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const Database = require('better-sqlite3');
    const db = new Database(PROFILE_SQLITE_DB_PATH);

    try {
      const stmt = db.prepare(sql);
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return stmt.all(...params);
      }

      const info = stmt.run(...params);
      return [info];
    } finally {
      db.close();
    }
  }
}
