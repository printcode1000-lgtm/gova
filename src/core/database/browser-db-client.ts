import { AbstractDatabaseClient } from './abstract-database-client';

export class BrowserDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;

    // Browser Client: use drizzle sqlite-proxy
    const { drizzle: proxyDrizzle } = require('drizzle-orm/sqlite-proxy');
    this._db = proxyDrizzle(async (sql: string, params: any[], method: string) => {
      const rows = await this.execute(sql, params);
      if (method === 'run') return { rows: [] };
      // Map object rows (e.g. [{id: 1, uid: "..."}]) to raw values for proxy
      const mappedRows = rows.map((row) => (row ? Object.values(row) : []));
      return { rows: mappedRows };
    });

    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const basePath = process.env.NEXT_PUBLIC_GOVA_BASE_PATH || '';
    const response = await fetch(`${basePath}/api/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database Error: ${errorText}`);
    }
    const data = await response.json();
    return data.rows || [];
  }
}
