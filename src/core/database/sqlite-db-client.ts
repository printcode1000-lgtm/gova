import 'server-only';

import { AbstractDatabaseClient } from './abstract-database-client';

export class SQLiteDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;

    const { drizzle } = require('drizzle-orm/better-sqlite3');
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(process.cwd(), 'public', 'sync_data', 'sync_sqlite', 'allusers.db');
    const sqlite = new Database(dbPath);
    this._db = drizzle(sqlite);

    const { ensureDevMigrations } = require('./ensure-migrations');
    ensureDevMigrations(this._db);

    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(process.cwd(), 'public', 'sync_data', 'sync_sqlite', 'allusers.db');
    const db = new Database(dbPath);

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
