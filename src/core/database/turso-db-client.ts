import 'server-only';

import { isDevelopment } from '@/core/config';
import { createDrizzleDevLogger } from '@/core/monitor/drizzle-dev-logger';
import { getTursoClient } from '@/lib/db/turso';
import { AbstractDatabaseClient } from './abstract-database-client';

export class TursoDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;

  get db(): any {
    if (this._db) return this._db;

    const { drizzle } = require('drizzle-orm/libsql');
    const client = getTursoClient();
    this._db = drizzle(client, isDevelopment ? { logger: createDrizzleDevLogger() } : undefined);

    return this._db;
  }

  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const client = getTursoClient();
    const result = await client.execute({ sql, args: params });
    return result.rows as any[];
  }
}
