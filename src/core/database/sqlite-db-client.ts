import { AbstractDatabaseClient } from './abstract-database-client';

export class SQLiteDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;

    if (typeof window !== 'undefined') {
      // Browser Client: use drizzle sqlite-proxy
      const { drizzle: proxyDrizzle } = require('drizzle-orm/sqlite-proxy');
      this._db = proxyDrizzle(async (sql: string, params: any[], method: string) => {
        const rows = await this.execute(sql, params);
        if (method === 'run') return { rows: [] };
        // Map object rows (e.g. [{id: 1, uid: "..."}]) to raw values for proxy
        const mappedRows = rows.map((row) => (row ? Object.values(row) : []));
        return { rows: mappedRows };
      });
    } else {
      // Node Server: use drizzle-orm/better-sqlite3
      const { drizzle } = require('drizzle-orm/better-sqlite3');
      const Database = require('better-sqlite3');
      const path = require('path');
      const dbPath = path.join(process.cwd(), 'public', 'sync_data', 'sync_sqlite', 'allusers.db');
      const sqlite = new Database(dbPath);
      this._db = drizzle(sqlite);
    }

    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    // 1. Browser Client in Development Mode -> Call Server Route
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Local Database Error: ${errorText}`);
      }
      const data = await response.json();
      return data.rows || [];
    }

    // 2. Node.js Server in Development Mode -> Query Local SQLite file directly
    try {
      const Database = require('better-sqlite3');
      const path = require('path');
      const dbPath = path.join(process.cwd(), 'public', 'sync_data', 'sync_sqlite', 'allusers.db');
      const db = new Database(dbPath);
      
      try {
        const stmt = db.prepare(sql);
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          return stmt.all(...params);
        } else {
          const info = stmt.run(...params);
          return [info];
        }
      } finally {
        db.close();
      }
    } catch (err: any) {
      console.error('Node.js Local SQLite Error:', err);
      throw err;
    }
  }
}
